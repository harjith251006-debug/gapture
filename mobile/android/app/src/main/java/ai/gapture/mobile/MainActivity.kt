package ai.gapture.mobile

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import ai.gapture.mobile.databinding.ActivityMainBinding

/**
 * The entire mobile app: one WebView pointed at the deployed Gapture web app.
 * No native data layer, no regulatory-processing logic (HLSA §6 Layer 10).
 *
 * Handles the WebView-specific concerns the web app cannot (Phase 15 tasks
 * 3-6): cookie/session persistence, the microphone permission bridge, file
 * chooser for uploads, external-link routing, and offline/error screens.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val appHost: String? by lazy { runCatching { Uri.parse(BuildConfig.APP_URL).host }.getOrNull() }

    /** A pending WebView audio-permission request, held while we ask the OS. */
    private var pendingPermissionRequest: PermissionRequest? = null

    private val micPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val request = pendingPermissionRequest
            pendingPermissionRequest = null
            if (request == null) return@registerForActivityResult
            if (granted) {
                request.grant(request.resources)
            } else {
                request.deny()
            }
        }

    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val cb = fileChooserCallback
            fileChooserCallback = null
            val uris = when {
                result.resultCode != RESULT_OK || result.data == null -> null
                result.data?.clipData != null -> {
                    val clip = result.data!!.clipData!!
                    Array(clip.itemCount) { clip.getItemAt(it).uri }
                }
                result.data?.data != null -> arrayOf(result.data!!.data!!)
                else -> null
            }
            cb?.onReceiveValue(uris ?: arrayOf())
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        if (BuildConfig.APP_URL.isBlank()) {
            showConfigNeeded()
            return
        }

        configureWebView()
        binding.retryButton.setOnClickListener {
            binding.errorView.visibility = android.view.View.GONE
            binding.webview.visibility = android.view.View.VISIBLE
            binding.webview.reload()
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webview.canGoBack()) binding.webview.goBack() else finish()
            }
        })

        if (savedInstanceState == null) {
            binding.webview.loadUrl(BuildConfig.APP_URL)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(binding.webview, true)

        binding.webview.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            // Voice Q&A: audio playback of the TTS response must not need a tap.
            mediaPlaybackRequiresUserGesture = false
            // Production is HTTPS-only; never downgrade.
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        // No JS debug bridge in release builds.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        binding.webview.webViewClient = GaptureWebViewClient()
        binding.webview.webChromeClient = GaptureWebChromeClient()
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush() // persist the session cookie across launches
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.webview.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        binding.webview.restoreState(savedInstanceState)
    }

    private fun showConfigNeeded() {
        binding.webview.visibility = android.view.View.GONE
        binding.errorView.visibility = android.view.View.VISIBLE
        binding.errorTitle.text = getString(R.string.config_needed_title)
        binding.errorMessage.text = getString(R.string.config_needed_message)
        binding.retryButton.visibility = android.view.View.GONE
    }

    private fun showError(message: String) {
        binding.webview.visibility = android.view.View.GONE
        binding.errorView.visibility = android.view.View.VISIBLE
        binding.errorTitle.text = getString(R.string.error_title)
        binding.errorMessage.text = message
        binding.retryButton.visibility = android.view.View.VISIBLE
    }

    private fun openExternally(uri: Uri) {
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
    }

    // --- WebViewClient -----------------------------------------------------

    private inner class GaptureWebViewClient : WebViewClient() {

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val url = request.url
            val scheme = url.scheme?.lowercase()
            if (scheme == "mailto" || scheme == "tel" || scheme == "sms") {
                openExternally(url)
                return true
            }
            // Same host (incl. Supabase auth redirects back to the app) stay in the WebView.
            val host = url.host
            if (host != null && appHost != null && (host == appHost || host.endsWith(".$appHost"))) {
                return false
            }
            // A signed Storage URL, an OAuth provider page, any other site -> the browser.
            openExternally(url)
            return true
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) {
                showError(getString(R.string.error_offline_message))
            }
        }

        override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
            // Never bypass certificate validation.
            handler.cancel()
            showError(getString(R.string.error_ssl_message))
        }

        override fun onPageFinished(view: WebView, url: String?) {
            CookieManager.getInstance().flush()
        }
    }

    // --- WebChromeClient --------------------------------------------------

    private inner class GaptureWebChromeClient : WebChromeClient() {

        override fun onPermissionRequest(request: PermissionRequest) {
            val wantsAudio = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
            if (!wantsAudio) {
                request.deny() // camera / MIDI / etc. are not used
                return
            }
            val hasOsPermission = ContextCompat.checkSelfPermission(
                this@MainActivity, Manifest.permission.RECORD_AUDIO,
            ) == PackageManager.PERMISSION_GRANTED

            if (hasOsPermission) {
                request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
            } else {
                pendingPermissionRequest = request
                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }

        override fun onPermissionRequestCanceled(request: PermissionRequest) {
            if (pendingPermissionRequest == request) pendingPermissionRequest = null
        }

        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean {
            fileChooserCallback?.onReceiveValue(null)
            fileChooserCallback = filePathCallback
            val intent = fileChooserParams.createIntent()
            return runCatching {
                fileChooserLauncher.launch(intent)
                true
            }.getOrElse {
                fileChooserCallback = null
                false
            }
        }
    }
}
