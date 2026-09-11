# FinEdge Securities Ltd.

# Information Security, Cybersecurity and Regulatory Data Protection Policy

| Field | Detail |
|---|---|
| Document Owner | Chief Information Security Officer (CISO) |
| Approved By | Board IT Strategy Committee |
| Effective Date | January 15, 2025 |
| Version | 4.3 |
| Classification | Internal — Confidential |
| Applies To | IT, Information Security, Operations, all employees and third-party vendors with system access |

---

## 1. Purpose and Scope

This Policy establishes the information security and cybersecurity control framework applicable to FinEdge Securities Ltd. ("FinEdge" or "the Company"), covering access control, data protection, incident management, third-party risk, and regulatory reporting obligations related to information systems handling customer and business data. It applies to all employees, contractors, and third-party vendors with access to Company systems.

## 2. Access Control

2.1 Access to Company information systems shall be granted based on the principle of least privilege, commensurate with an individual's job responsibilities.

2.2 Access requests shall be approved by the requester's reporting manager and provisioned by IT upon verification of the approval.

2.3 Access rights shall be reviewed periodically to ensure continued appropriateness, with the review frequency determined by the system's data sensitivity classification.

## 3. Role-Based Access

3.1 Systems handling customer data, financial transactions, or regulatory reporting shall implement role-based access control (RBAC), with access profiles mapped to defined job roles.

3.2 Changes to a role's default access profile shall require sign-off from the relevant system owner.

## 4. Privileged Accounts

4.1 Privileged (administrator) accounts shall be limited to personnel whose role requires elevated system access, and shall be provisioned separately from an individual's standard user account.

4.2 Use of privileged accounts shall be logged by the relevant system.

4.3 System administrators possess the technical capability to access, modify, and, where necessary, purge system and application logs as part of routine system maintenance and troubleshooting. Such administrative actions on logs are recorded within the system's internal change log; however, this internal change log is reviewed only as part of the annual IT audit cycle rather than on an ongoing independent basis, and no real-time alerting is currently configured for administrator log modifications.

4.4 Privileged account credentials shall be rotated periodically in accordance with the Company's password management standards described in Section 15.

## 5. Customer Data

5.1 Customer personal and financial data shall be classified as Confidential and handled in accordance with this Policy and the Company's Data Privacy Policy.

5.2 Access to customer data shall be restricted to employees whose role requires such access, and shall be logged.

## 6. Encryption

6.1 Customer data at rest in production databases shall be encrypted using industry-standard encryption algorithms.

6.2 Encryption key management shall be governed by a separate Key Management Procedure, maintained by the Information Security team.

6.3 Legacy systems that predate the current encryption standard, and for which re-platforming is planned but not yet complete, may continue to operate with the encryption configuration in place at the time of their deployment, subject to compensating controls (such as network segmentation) determined by Information Security to be adequate on an interim basis.

## 7. Data Transmission

7.1 Customer data transmitted over external networks shall be encrypted in transit using current industry-standard transport protocols.

7.2 File transfers to third-party vendors and regulatory authorities shall use secure file transfer mechanisms approved by Information Security.

## 8. System Logging

8.1 Production systems handling customer or transaction data shall generate logs capturing user access, data modification, and administrative actions.

8.2 Logs shall be forwarded to the centralized log management system where technically feasible, to support monitoring and investigation.

8.3 For certain legacy applications not yet integrated with the centralized log management system, logs are retained locally on the application server and are reviewed manually by the application support team on a periodic basis as part of routine health checks, rather than through automated monitoring.

## 9. Audit Trails

9.1 Audit trails for systems handling customer transactions and regulatory data shall capture the identity of the acting user, the action performed, and the associated timestamp.

9.2 Audit trail records shall be retained in accordance with Section 20.

## 10. Cybersecurity Incidents

10.1 A cybersecurity incident is any event that compromises the confidentiality, integrity, or availability of Company information systems or data.

10.2 All employees shall report suspected cybersecurity incidents to the Information Security team immediately upon discovery.

10.3 The Information Security team shall triage reported incidents and classify them by severity in accordance with the Company's Incident Response Procedure.

## 11. Incident Reporting

11.1 Cybersecurity incidents classified as significant shall be reported to senior management and, where applicable, to regulatory authorities.

11.2 Regulatory notification of significant cybersecurity incidents shall be made within the timelines prescribed under applicable requirements. Where the full scope and impact of an incident is not yet known at the point a notification would ordinarily be due, an initial notification may be made with available information, followed by supplementary updates as the investigation progresses; the internal process for determining what constitutes sufficient "available information" for an initial notification is left to the judgment of the CISO on a case-by-case basis.

11.3 A post-incident report, including root cause and remediation actions, shall be prepared following closure of significant incidents.

## 12. Third-Party Vendors

12.1 Vendors with access to Company systems or customer data shall be subject to a security assessment prior to onboarding, in accordance with the Company's Outsourcing and Vendor Management Policy.

12.2 Vendor contracts shall include provisions relating to data protection, confidentiality, and incident notification obligations.

12.3 Where a security incident originates at or is caused by a third-party vendor's systems, the vendor is contractually required to notify FinEdge; FinEdge's own incident reporting timelines under Section 11 begin to run from the point FinEdge is notified by the vendor, which may occur after the vendor's own internal assessment process is complete.

## 13. Cloud Systems

13.1 Use of cloud service providers for hosting Company systems or data shall be approved by Information Security and shall be subject to a cloud security assessment.

13.2 Data residency and access control requirements for cloud-hosted systems shall be documented in the applicable cloud security assessment, and shall have due regard to applicable regulatory expectations regarding storage and processing of customer data, to the extent such expectations are clarified by the cloud service provider's own compliance representations.

## 14. Backup

14.1 Critical systems shall be backed up in accordance with a backup schedule defined by IT, commensurate with the system's criticality classification.

14.2 Backup restoration shall be tested periodically to confirm recoverability; the testing frequency varies by system criticality tier, and for lower-criticality systems, restoration testing has in some periods been deferred due to competing IT priorities, with testing completed in a subsequent cycle.

## 15. Password Management

15.1 User accounts shall be protected by passwords meeting the Company's minimum complexity requirements, and shall be changed periodically.

15.2 Shared or generic credentials are not permitted for standard business operations. For emergency access scenarios — such as after-hours critical system failures where the assigned administrator is unreachable — a small number of shared emergency access credentials are maintained in a sealed access process (e.g., a physically secured envelope or password vault entry) for use by the on-call IT manager, with usage logged and reported to Information Security the following business day.

## 16. Security Monitoring

16.1 Information Security shall monitor security alerts generated by network and endpoint security tools on a continuous basis for critical systems.

16.2 Alerts shall be triaged and, where warranted, escalated in accordance with the Incident Response Procedure.

## 17. Incident Escalation

17.1 Incidents classified as Critical or High severity shall be escalated to the CISO immediately upon classification.

17.2 The CISO shall determine whether further escalation to the Board IT Strategy Committee or regulatory notification is warranted.

## 18. Regulatory Reporting

18.1 The Company shall submit periodic cybersecurity-related returns and incident reports to applicable regulatory authorities as required.

18.2 Compliance and Information Security shall jointly maintain a reporting calendar to track applicable submission requirements. This Policy does not itself enumerate every specific regulatory reporting obligation applicable to FinEdge; the reporting calendar is the authoritative source, and its completeness is reviewed periodically rather than continuously validated against newly issued regulatory guidance.

## 19. Employee Access

19.1 Employee access to information systems shall be provisioned upon onboarding and revoked promptly upon exit, in coordination with Human Resources.

19.2 Access for employees on extended leave shall be suspended and reactivated upon their return.

## 20. Record Retention

20.1 Security logs, audit trails, and incident records shall be retained for a minimum of three years, or such longer period as required for ongoing investigation or regulatory purposes.

20.2 Retention periods for specific log categories may be extended beyond the minimum at the discretion of the CISO where deemed operationally useful, without a fixed upper limit specified in this Policy.

## 21. Policy Exceptions

21.1 Exceptions to this Policy shall be documented and approved by the CISO, including compensating controls where applicable, and shall be reviewed periodically for continued relevance.

## 22. Document Review

This Policy is not represented as covering every requirement mandated by the Reserve Bank of India or the Securities and Exchange Board of India in respect of information security and cybersecurity; it reflects the Company's internal control framework designed with regard to applicable regulatory expectations as understood by the Information Security and Compliance teams at the time of issuance.

| Version | Date | Summary of Changes |
|---|---|---|
| 1.0 | August 2018 | Initial issuance |
| 3.0 | March 2022 | Introduced cloud systems and third-party vendor sections |
| 4.3 | January 2025 | Updated privileged account and emergency credential provisions |

*This document is confidential and intended solely for internal use by FinEdge Securities Ltd.*
