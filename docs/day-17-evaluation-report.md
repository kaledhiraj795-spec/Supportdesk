# Day 17 AI Evaluation Report

## Official labelled-ticket evaluation: BLOCKED — lead dataset not provided

The evaluation runner is implemented at `apps/api/src/ai/evaluation.cli.ts`. No lead-supplied 20-ticket labelled dataset was found in the repository or provided, so the official category/priority evaluation remains blocked and no official accuracy is reported. Running the command without a dataset previously exited with code 2 and printed usage; it did not call Gemini. The separate live synthetic reply-quality evaluation is recorded below and is not a substitute for the lead dataset.

## Repeatable run

From `apps/api`, run:

```powershell
npm run ai:evaluate -- <path-to-lead-dataset.json> --report <path-to-report.md>
```

The dataset must contain **exactly 20 unique records**. Each record requires:

- `id`: a unique opaque case identifier containing only letters, digits, underscores, and hyphens; do not use customer names or contact data.
- `title`: ticket title (maximum 500 characters).
- `description`: ticket description within `AI_TICKET_DESCRIPTION_MAX_LENGTH`.
- `expected`: an object containing `category` and `priority` using the API's supported values.

The command fails validation rather than padding, truncating, or inventing records. The dataset itself is not copied into the report. Provider failures or invalid predictions count as incorrect; all 20 requests are attempted sequentially.

## Metrics

- Category accuracy = correct categories / evaluated tickets × 100.
- Priority accuracy = correct priorities / evaluated tickets × 100.
- Exact-match accuracy = tickets with both correct / evaluated tickets × 100.

Metrics are rounded to two decimal places. No accuracy value is available until the lead dataset is supplied and the script is run with an authorized Gemini configuration.

## Evaluator implementation evidence

- Synthetic evaluator unit fixtures verify 20-row schema validation, unique IDs, separate accuracy calculations, provider-failure handling, and privacy-conscious report formatting.
- These fixtures are software tests only; they are not labelled SupportDesk tickets and are not part of an official evaluation.
- No official lead-dataset rows, predictions, or accuracy percentages are claimed.

## Live synthetic reply-quality evaluation

### Execution evidence and isolation

- Model: `gemini-3.5-flash-lite`; reply prompt: `suggest-reply-v4`.
- Run date: 2026-11-26.
- Four previously completed login scenarios are retained below. Sixteen additional distinct scenarios were generated for this continuation, four each in Account, Billing, Technical Support, and General.
- All fixture tickets and comments were held in memory. The API ticket and comment service modules were mocked; no production database query, insert, update, or deletion was made. Names and ticket IDs are synthetic.
- All 16 new scenarios received a complete generated response. Two provider stream attempts returned transient HTTP 503 `UNAVAILABLE` errors: SYN-04 failed in the first batch and succeeded in the rerun; SYN-16 failed once and then succeeded on retry. The four earlier scenarios were each called twice while capturing their output. Across the prior and current runs there were 26 provider attempts: 24 successful model responses and two failures, with 20 distinct case outputs retained in this report.
- `apps/api/tests/ai.synthetic-live.test.ts` and `apps/api/tests/ai.synthetic-16-live.test.ts` were temporary test harnesses and were removed after generation. No application logic was changed.

### Prompt v4 baseline rubric and score (historical)

Each reply is assessed on six equally weighted binary criteria:

1. **Relevance** — directly addresses the ticket subject, description, and message.
2. **Correctness** — does not contradict context or state unsupported product, financial, or process facts.
3. **Completeness** — includes a greeting, acknowledgement, relevant troubleshooting or question, next step, and closing.
4. **Professionalism** — clear, respectful, and grammatically acceptable.
5. **Privacy** — does not solicit credentials, authentication codes, or unnecessary sensitive identifiers.
6. **Promises** — makes no unsupported commitment, workflow claim, or service-time promise.

Each passing criterion earns one point. A case contributes its passed-criteria count divided by six to the score out of 20. The total is divided by 120 and converted to a score out of 20; the target is at least 16/20 (80%). This is a response-quality score, not category/priority accuracy.

| Case | Scenario / category | Passed criteria | Score / 6 | Main finding |
|---|---|---|---:|---|
| LOGIN-01 | Incorrect password / Account | R, C, Complete, Professional, Privacy, Promises | 6 | Relevant troubleshooting; no sensitive details requested. |
| LOGIN-02 | Password reset email missing / Account | R, Complete, Professional | 3 | Requests exact account email and claims system-record/delivery review. |
| LOGIN-03 | Account login error / Account | R, C, Complete, Professional, Privacy, Promises | 6 | Relevant browser/device question; complete reply. |
| LOGIN-04 | Unable to access account / Account | R, Complete, Professional | 3 | Requests alternative contact/account details and promises account review. |
| SYN-01 | Display name does not save / Account | R, C, Complete, Privacy | 4 | Typo in greeting; promises team investigation. |
| SYN-02 | Email-change verification missing / Account | R, Complete, Professional | 3 | Requests exact new email and promises delivery-status review. |
| SYN-03 | Two-step code expires / Account | R, C, Complete, Professional, Privacy | 5 | Relevant question; unsupported support-team review promise. |
| SYN-04 | Language preference resets / Account | R, C, Complete, Professional, Privacy | 5 | Relevant question; promises investigation/resolution. |
| SYN-05 | Approved refund not posted / Billing | R, Complete, Professional | 3 | Invents typical processing time; requests last four payment digits; promises transaction review. |
| SYN-06 | Duplicate posted charges / Billing | R, C, Complete, Professional | 4 | Requests order number and last four card digits; promises urgent transaction review. |
| SYN-07 | Invoice opens blank / Billing | R, Complete, Professional, Privacy | 4 | Re-asks which browsers after customer said they tried two; promises investigation. |
| SYN-08 | Declined checkout / pending authorization / Billing | R, Complete, Professional, Privacy | 4 | Invents bank-hold/release guidance and promises payment-log review. |
| SYN-09 | CSV export has no rows / Technical Support | R, C, Complete, Professional, Privacy | 5 | Relevant browser/OS question; promises team investigation. |
| SYN-10 | Attachment upload times out / Technical Support | R, Complete, Professional, Privacy | 4 | Claims access to connection logs and promises technical review. |
| SYN-11 | Dashboard blank after update / Technical Support | R, C, Complete, Professional, Privacy | 5 | Relevant browser/version question; promises follow-up and a fix path. |
| SYN-12 | Email notifications missing / Technical Support | R, Complete, Professional, Privacy | 4 | Promises access to email-delivery logs and review. |
| SYN-13 | Resolved ticket, issue persists / General | R, Complete, Professional, Privacy | 4 | Promises to reopen the ticket without confirmation. |
| SYN-14 | Copy of conversation requested / General | R, Complete, Professional, Privacy | 4 | Claims no export feature and recommends an unverified browser workflow. |
| SYN-15 | Asks about support hours / General | R, Complete, Professional, Privacy | 4 | No hours supplied; promises to follow up with details “as soon as possible.” |
| SYN-16 | Waiting-on-customer status / General | R, C, Complete, Professional, Privacy | 5 | Avoids resending documents but promises to locate, update, and follow up. |

**Total: 85/120 criteria = 14.17/20 = 70.83%. Target (80%): NOT MET.**

Dimension totals: relevance 20/20; correctness 9/20; completeness 20/20; professionalism 19/20; privacy 15/20; unsupported-promises criterion 2/20. The four previous login replies were complete and issue-relevant, but the expanded privacy/promise rubric flags LOGIN-02 and LOGIN-04.

### Preserved login responses (previous live run)

#### LOGIN-01 — Incorrect password

> Hello Avery Park,
>
> Thank you for reaching out to support regarding the sign-in issues you are experiencing, and for letting us know that the error appears immediately after submitting your password even after checking your Caps Lock and keyboard layout.
>
> To help us narrow down this issue, could you please confirm if you have attempted to clear your browser's cache and cookies or tried logging in using an alternative browser or private browsing window?
>
> If the issue persists, please let us know so we can guide you through the next steps for your account.
>
> Best regards,
> Customer Support Team

#### LOGIN-02 — Password reset email missing

> Hello Jordan,
>
> Thank you for reaching out regarding the password reset email, and I understand you have already checked your spam folder without finding the message.
>
> Could you please confirm the exact email address you have on file with your account so we can verify our system records?
>
> Once we have that confirmation, we will investigate the delivery status further and provide the next steps. Thank you for your patience.
>
> Best regards,
> Customer Support Team

#### LOGIN-03 — Account login error

> Hello Riley Morgan,
>
> Thank you for reaching out to support. I understand you are seeing an unspecified error after submitting the account login form, and that you have not changed your password recently.
>
> To help us investigate this login issue further, could you please let us know which web browser or device you are using when the error occurs?
>
> Once we have that additional detail, we can guide you on the next steps to get this resolved.
>
> Best regards,
> Customer Support Team

#### LOGIN-04 — Unable to access account

> Hello Casey Nguyen,
>
> Thank you for reaching out to us for assistance with recovering access to your account. I understand you are currently unable to sign in and no longer have access to the email address previously associated with it.
>
> To help us securely verify your identity and assist with the recovery process without requiring your password or a verification code sent to your old email, could you please provide any alternative contact information or previously used account details that might help us confirm ownership?
>
> Once we have this additional detail, our team can review your account status and guide you through the appropriate next steps.
>
> Best regards,
> Customer Support Team

### Additional 16 generated responses

#### SYN-01 — Account: Profile display name does not save

> Hello Mia,
>
> Thank to you for reaching out and letting us know that your profile display name reverts to the previous name after refreshing the page, even though no error message appears when you click Save.
>
> To help us investigate why the updated name is not persisting, could you please let us know which web browser and device you are currently using to make these changes?
>
> Once we have those details, our team can look into the saving issue further and guide you on the next steps.
>
> Best regards,
> Customer Support Team

#### SYN-02 — Account: Email-change verification missing

> Hello Theo,
>
> Thank you for reaching out to us regarding the verification email for your account address change. I understand that the verification message has not arrived at your new address, even after checking your spam folder, though I'm glad to hear you still have access to your current account.
>
> To help us look into why the verification message may be delayed or blocked, could you please confirm the exact new email address you are trying to switch to?
>
> Once we have that confirmation, our team will review the delivery status and provide the appropriate next steps to help you complete the update securely.
>
> Best regards,
> Customer Support Team

#### SYN-03 — Account: Two-step verification code expires

> Hello Ren Ito,
>
> Thank you for reaching out to us regarding the trouble you are experiencing with your two-step verification codes expiring before you can use them, even though your phone clock is set automatically.
>
> To help us investigate this further, could you please let us know which device and browser you are currently using to attempt your sign-in?
>
> Once we have this information, our support team can review the issue more closely and guide you toward a resolution.
>
> Best regards,
> Customer Support Team

#### SYN-04 — Account: Language preference resets

> Hello Nia Patel,
>
> Thank you for reaching out and letting us know that your account language preference resets to English every time the page is refreshed after you select and save Spanish.
>
> To help us investigate why your saved preference is not persisting through a refresh, could you please confirm which browser and device you are currently using to access your account?
>
> Once we have that information, we will be able to look further into the issue and guide you toward a resolution.
>
> Best regards,
> Customer Support Team

#### SYN-05 — Billing: Approved refund not posted

> Hello Oliver,
>
> Thank you for reaching out to us. I understand you are seeing a refund marked as approved in your account, but the credit has not appeared on your bank statement after twelve business days, and that you can see the original purchase without seeing a separate refund credit.
>
> Once a refund is approved on our end, processing times can vary depending on the financial institution, though it typically posts within several business days. To help us look into the status of this transfer for you, could you please confirm the last four digits of the payment card or account used for the original purchase?
>
> Once we have that information, our team can review the transaction details further to ensure everything is progressing correctly.
>
> Best regards,
> Customer Support Team

#### SYN-06 — Billing: Possible duplicate charge

> Hello Harper Kim,
>
> Thank you for reaching out to us regarding the billing discrepancy. I understand you are seeing two posted charges for the same amount and date in your bank app, even though you only placed a single order.
>
> To help us investigate this right away, could you please provide the order number, the exact date of the transaction, and the last 4 digits of the payment card used?
>
> Once we have those details, we will review the transaction records and guide you on the next steps toward a resolution.
>
> Best regards,
> Customer Support Team

#### SYN-07 — Billing: Invoice opens blank

> Hello Ezra,
>
> Thank you for reaching out and letting us know that selecting download for your April invoice opens a blank page, and that you have already tested this across two different browsers.
>
> Could you please let us know which specific web browsers you used when attempting to download the invoice?
>
> Once we have that information, we will be able to investigate the issue further. Thank you for your patience, and we look forward to helping you resolve this.
>
> Best regards,
> Support Team

#### SYN-08 — Billing: Declined checkout with pending authorization

> Hello Imani Cole,
>
> Thank you for reaching out and letting us know about the declined checkout message and the pending authorization you are seeing in your bank app. We completely understand your concern about avoiding duplicate charges, and you were right to hold off on submitting the payment again.
>
> When a transaction is declined at checkout but shows as pending with your financial institution, that pending entry is typically an authorization hold rather than a completed charge. These temporary holds are usually released automatically by your bank within a few business days, depending on their processing times.
>
> Could you please confirm the exact date and time of the checkout attempt, along with the currency and amount of the pending authorization?
>
> Once we have that information, we will be happy to review our payment logs to verify the status of the transaction and advise you on the next steps. Thank you for your patience, and we look forward to helping you resolve this.
>
> Best regards,
> Customer Support Team

#### SYN-09 — Technical Support: CSV export is empty

> Hello,
>
> Thank you for reaching out regarding the CSV export issue. I understand that you are able to see twelve records on your screen for the selected week, but the downloaded file contains only the column headers without any data rows.
>
> To help us investigate why the export is not capturing the visible records, could you please let us know which browser and operating system you are using when attempting the download?
>
> Once we have this additional information, our team can look further into the export behavior. We appreciate your patience and look forward to your response.
>
> Best regards,
> Support Team

#### SYN-10 — Technical Support: Attachment upload stalls

> Hello Ava,
>
> Thank you for reaching out regarding the issue with uploading your 8 MB PDF attachment, where the progress indicator stalls at 95 percent before timing out.
>
> To help us investigate this further, could you please let us know which web browser and operating system you are currently using when attempting the upload?
>
> Once we have those details, our technical team can review the connection logs to help resolve this timeout issue for you.
>
> Best regards,
> Customer Support Team

#### SYN-11 — Technical Support: Dashboard blank after update

> Hello Leo,
>
> Thank you for reaching out and letting us know that your dashboard appears blank following the recent application update, while other pages like the ticket list continue to load normally.
>
> To help us investigate this further, could you please let us know which specific web browser and version you are currently using on your desktop?
>
> Once we have those details, our team will review the issue and follow up with the next steps to get your dashboard displaying correctly.
>
> Best regards,
> Customer Support Team

#### SYN-12 — Technical Support: Email notifications missing

> Hello Zoe Chen,
>
> Thank you for reaching out regarding the email notifications not arriving for your ticket updates. I understand that while your in-app notifications are working properly, you are not receiving the corresponding email alerts even after checking your spam folder.
>
> To help us investigate this further, could you please confirm if you have checked your email provider's quarantine or blocked sender lists, or if you are using a corporate email domain that might have strict inbound filtering rules?
>
> Please let us know so we can review our email delivery logs and determine the next steps to resolve this for you.
>
> Best regards,
> Customer Support Team

#### SYN-13 — General: Resolved ticket, issue persists

> Hello Felix Adams,
>
> Thank you for reaching out and letting us know that the error is still present, even though this ticket was previously marked as resolved. We apologize for any confusion and want to ensure this is thoroughly looked into for you.
>
> Could you please share the specific error message or any new details you are seeing when the issue occurs so we can review it accurately?
>
> We will reopen your ticket for further investigation as soon as we have these details. Thank you for your patience and cooperation.
>
> Best regards,
> Customer Support Team

#### SYN-14 — General: Copy of ticket conversation requested

> Hello Dara,
>
> Thank you for reaching out. I understand you are looking to get a readable copy of this ticket conversation for your records.
>
> While our system does not currently offer a direct export or download button within the customer portal, you can easily save a copy by highlighting the conversation text in your browser and using your browser's print function to save the page as a PDF.
>
> If you would like, I can also review your request further or help with any other questions you may have regarding this support thread. Please let me know how you would like to proceed.
>
> Best regards,
> Customer Support Team

#### SYN-15 — General: Asks about support response hours

> Hello Noah,
>
> Thank you for reaching out with your question regarding our support response hours and expected reply times.
>
> Could you please let us know your specific time zone so we can better assist you with understanding our availability relative to your location?
>
> We appreciate your patience, and we will follow up with the requested details as soon as possible.
>
> Best regards,
> Customer Support Team

#### SYN-16 — General: Waiting-on-customer status after sending information

> Hello Amara Johnson,
>
> Thank you for reaching out and letting us know that your ticket status is still showing as waiting on customer even though you have already provided the requested information.
>
> Please rest assured that you do not need to resend any sensitive documents. To help us locate your submission and update your ticket status correctly, could you please confirm the date and time when you sent the information, or the method you used to submit it?
>
> Once we have this quick clarification, our team will locate your submission, update the ticket status, and follow up with you on the next steps.
>
> Best regards,
> Support Team

### Prompt v4 baseline findings (historical)

- The 80% target was not met. The main observed quality gap was unsupported promises or claims about internal capabilities (such as reviewing delivery/payment logs, reopening tickets, or committing to follow up). Several replies also requested unnecessary exact email or payment-card details, and one reply asked again for browser details already supplied.
- The live synthetic reply score is not a classification accuracy result and does not satisfy the blocked official 20-ticket category/priority evaluation.
- The lead-supplied 20 labelled tickets and 10 malicious samples remain pending. No official Day 17 accuracy is claimed.

## Prompt v5 weak-scenario retest

### Execution evidence

- Prompt version: `suggest-reply-v5`; model: `gemini-3.5-flash-lite`.
- Retested the 18 cases flagged by the v4 review: LOGIN-02, LOGIN-04, and SYN-01 through SYN-16. LOGIN-01 and LOGIN-03 had passed all six criteria previously and were retained unchanged at 6/6 each.
- The same synthetic ticket subjects, descriptions, and public comments were used. Ticket and comment services were mocked in memory; no production database or customer ticket was accessed or changed.
- All 18 cases produced a final response. Four initial attempts failed transiently (503 `UNAVAILABLE` for SYN-06 and SYN-08; 429 `RESOURCE_EXHAUSTED` for SYN-13 and SYN-14); each succeeded on retry. Total: 22 provider attempts, 18 successful final case outputs, 4 recovered transient errors.
- Prompt contract and usage-version tests: passed, 21 tests across two files.
- API source typecheck: passed.
- API test typecheck: passed.
- Historical full API suite result at this prompt-v5 retest (before later security/composer regression fixes): passed, 111 tests across 16 files. See the Day 17 EOD and security reports for the final 121-test result.

### Updated score

The same six equally weighted criteria and binary rubric from the v4 baseline were applied. Each case contributes its passed criteria divided by six to the score out of 20.

| Case | Passed criteria | Score / 6 | Remaining issue |
|---|---|---:|---|
| LOGIN-01 (unchanged) | R, C, Complete, Professional, Privacy, Promises | 6 | None identified. |
| LOGIN-02 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified; asks for reset-attempt time, not the full email. |
| LOGIN-03 (unchanged) | R, C, Complete, Professional, Privacy, Promises | 6 | None identified. |
| LOGIN-04 | R, C, Complete, Professional, Privacy | 5 | Implies an agent will review and advise. |
| SYN-01 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified. |
| SYN-02 | R, C, Complete, Professional | 4 | Email domain request is unnecessary identifying data; “so we can proceed” implies a workflow. |
| SYN-03 | R, Complete, Professional, Privacy, Promises | 5 | Speculates about network/authentication-server synchronization without evidence. |
| SYN-04 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified. |
| SYN-05 | R, Complete, Professional | 3 | Unsupported refund-time guidance; requests bank name; implies support can provide standard timing. |
| SYN-06 | R, Professional | 2 | Requests transaction/authentication references and amounts, speculates about a hold despite both entries being posted, and lacks a closing/clear resolution step. |
| SYN-07 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified; uses the already-known two-browser detail and asks for different information. |
| SYN-08 | R, Complete, Professional, Privacy | 4 | States unsupported hold/release timing and assures no duplicate charge. |
| SYN-09 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified. |
| SYN-10 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified. |
| SYN-11 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified. |
| SYN-12 | R, Complete, Professional, Privacy, Promises | 5 | Re-asks whether email notifications are enabled, already stated in the description. |
| SYN-13 | R, C, Complete, Professional, Privacy | 5 | Implies information will be made available for internal review. |
| SYN-14 | R, C, Complete, Professional, Privacy, Promises | 6 | None identified; suggests the browser's print/save-as-PDF action. |
| SYN-15 | R, Complete, Professional, Privacy | 4 | Refers to unspecified documentation and implies support can provide hours/details. |
| SYN-16 | R, Complete, Professional, Privacy | 4 | Refers to an email thread not in context and implies an agent will review/update status. |

**Current total: 101/120 criteria = 16.83/20 = 84.17%. Target (80%): MET.**

Dimension totals: relevance 20/20; correctness 13/20; completeness 19/20; professionalism 20/20; privacy 17/20; unsupported-promises criterion 12/20. The score clears the target, but correctness, privacy, promises, and one incomplete reply still have failures.

### Actual v5 generated responses

#### LOGIN-02 — Password reset email missing

> Hello,
>
> Thank you for reaching out to let us know that you have not received the password reset email, and for checking your spam folder.
>
> Please verify whether your email provider has any strict filtering rules or firewalls that might be blocking automated messages from reaching your inbox.
>
> To help us look into this further, could you please let us know the exact date and time of your most recent password reset attempt?
>
> Best regards,
> Customer Support Team

#### LOGIN-04 — Unable to access account

> Hello,
>
> Thank you for reaching out to us regarding your account access. I understand that you need help recovering your account after losing access to your previous email address.
>
> Since you are unable to access the email address associated with the account, could you please let us know what specific error message or screen you see when you attempt to log in?
>
> As a next step, please reply with the error details so a support agent can review your situation and advise you on the available options.
>
> Best regards,
> Customer Support Team

#### SYN-01 — Account: Profile display name does not save

> Hello Mia Santos,
>
> Thank you for reaching out about the display name not saving on your profile. We understand how frustrating it is when updates do not persist after reloading the page.
>
> To help us better understand what might be happening, could you let us know which web browser and device you are currently using to update your profile?
>
> As a next step, you can try clearing your browser's cache and cookies or attempting the update in a private browsing window to see if the new display name saves correctly.
>
> Best regards,
>
> Customer Support Team

#### SYN-02 — Account: Email-change verification missing

> Hello,
>
> Thank you for reaching out regarding the email verification message for your account change. I understand you have checked your spam folder and that no verification email has arrived yet, though you still have access to your current email address.
>
> To help us look into this further, could you please let us know the domain of the new email address you are trying to use?
>
> Please ensure your inbox is able to receive incoming messages, and feel free to reply with the requested domain so we can proceed.
>
> Best regards,
> Customer Support Team

#### SYN-03 — Account: Two-step verification code expires

> Hello Ren Ito,
>
> Thank you for reaching out to us regarding the trouble you are experiencing with your two-step verification codes expiring prematurely.
>
> Since your phone clock is already set to update automatically, this issue can sometimes be caused by a slight network delay or synchronization offset between your device's time and our authentication servers.
>
> To help us narrow this down, could you please let us know approximately how many seconds or minutes elapse between the time you request the code and when you attempt to enter it on the sign-in page?
>
> Please check your device's date and time settings to ensure the time zone is also set correctly, or try restarting your device before your next login attempt.
>
> Best regards,
> Customer Support Team

#### SYN-04 — Account: Language preference resets

> Hello Nia Patel,
>
> Thank you for reaching out and sharing the details about your account language preference resetting to English after every refresh.
>
> To help us look into this behavior further, could you please let us know which web browser and device you are currently using when this occurs?
>
> Once you have a moment to share those details, please try clearing your browser's cache and cookies to see if the language preference successfully saves.
>
> Best regards,
>
> Customer Support Team

#### SYN-05 — Billing: Approved refund not posted

> Hello Oliver,
>
> Thank you for reaching out regarding the refund that is marked as approved on your account. I understand it can be concerning when a credit does not appear on your bank statement after twelve business days, especially when the original purchase is visible.
>
> Generally, once a refund is approved on our end, financial institutions can take additional business days to post the credit to your statement depending on their specific processing times. Could you please confirm the name of your financial institution or bank so we can provide more relevant context regarding standard processing timeframes?
>
> As a next step, you may want to reach out directly to your bank's support team with the transaction details for the original purchase to see if they have any pending credits awaiting final posting.
>
> Best regards,
>
> Customer Support Team

#### SYN-06 — Billing: Possible duplicate charge

> Hello Harper Kim,
>
> Thank you for reaching out and letting us know about seeing two posted charges for the same order in your bank application.
>
> When reviewing charges that appear twice, it is often helpful to check the specific transaction reference numbers or merchant descriptors listed next to each entry in your bank statement to see if one may be a temporary authorization that is still settling, or if they represent separate transaction identifiers.
>
> To help look into this further, could you please share the exact transaction amounts, dates, and any reference or authorization numbers visible for both charges?

#### SYN-07 — Billing: Invoice opens blank

> Hello Ezra,
>
> Thank you for reaching out, and I apologize for the trouble you are experiencing when trying to download your April invoice from your billing history.
>
> Since you mentioned that you already tested this in two different browsers with the same result, could you please let us know the specific file format or browser version you are currently using, as well as whether you have any pop-up blockers or browser extensions enabled that might be preventing the file from opening?
>
> To help move this forward, you can try temporarily disabling any active browser extensions or pop-up blockers and attempting the download once more.
>
> Best regards,
>
> Customer Support Team

#### SYN-08 — Billing: Declined checkout with pending authorization

> Hello Imani Cole,
>
> Thank you for reaching out to us. We understand how concerning it is to see a declined message at checkout while your bank app shows a pending authorization, especially when no receipt was issued.
>
> Please rest assured that pending authorizations on your bank statement are temporary holds placed by your financial institution and are typically released automatically within a few business days if the transaction was not completed on our system. Since you have not attempted to submit the payment again, you do not need to worry about duplicate charges being created.
>
> As a next step, please check with your financial institution to confirm the status of the pending authorization, or feel free to let us know if you need any further assistance completing your order once the hold is released.
>
> Best regards,
>
> Customer Support Team

#### SYN-09 — Technical Support: CSV export is empty

> Hello,
>
> Thank you for reaching out regarding the CSV export issue. I understand that while twelve records are visible on your screen for the selected week, the downloaded CSV file contains only column headers and no data rows.
>
> To help us better understand what might be causing this, could you please let us know which web browser and operating system you are currently using when attempting the download?
>
> As a next step, you might try clearing your browser cache or attempting the export in a different browser to see if the file populates correctly.
>
> Best regards,
> Customer Support Team

#### SYN-10 — Technical Support: Attachment upload stalls

> Hello Ava Wilson,
>
> Thank you for reaching out regarding the attachment upload stalling at 95 percent when attempting to upload an 8 MB PDF file.
>
> To help narrow down what might be causing the timeout during the final stage of the upload, could you let us know which web browser and operating system you are currently using?
>
> As a next step, you may wish to try clearing your browser cache or testing the upload in an incognito or private browsing window.
>
> Best regards,
>
> Customer Support Team

#### SYN-11 — Technical Support: Dashboard blank after update

> Hello Leo,
>
> Thank you for reaching out and letting us know that your dashboard appears blank following the recent application update, while other pages like the ticket list continue to load normally in your desktop browser.
>
> To help us better understand what might be causing this display issue on the dashboard, could you please let us know which specific web browser and version you are currently using?
>
> As a next step, you might also try clearing your browser cache and cookies to see if that helps load the dashboard correctly.
>
> Best regards,
> Customer Support Team

#### SYN-12 — Technical Support: Email notifications missing

> Hello,
>
> Thank you for reaching out regarding the email notifications for ticket updates. I understand that your in-app notifications are working properly, but the corresponding email alerts are not arriving even after checking your spam folder.
>
> To help us narrow this down, could you please let us know if you are currently using a personal email provider or a corporate email domain with strict filtering policies?
>
> As a next step, please verify that your notification preferences are toggled on specifically for email alerts in your account settings.
>
> Best regards,
> Customer Support Team

#### SYN-13 — General: Resolved ticket, issue persists

> Hello Felix,
>
> Thank you for reaching out and letting us know that the error is still present.
>
> To help us better understand the situation, could you please share any specific error message or code you are currently seeing on your screen?
>
> Please reply with those details so we can ensure the information is available for review, and have a great day.

#### SYN-14 — General: Copy of ticket conversation requested

> Hello Dara Okafor,
>
> Thank you for reaching out and letting us know that a readable copy of the messages would be sufficient for your records regarding your ticket.
>
> You can easily save a copy of this conversation directly from your browser by using the print or save-as-PDF function while viewing the ticket page.
>
> Please let us know if you need any further assistance with viewing your messages, and have a great day.

#### SYN-15 — General: Asks about support response hours

> Hello Noah Silva,
>
> Thank you for reaching out regarding our support availability and response times.
>
> Since support hours and response-time commitments are not currently listed in our available ticket details, could you please let us know which specific time zone you are currently located in?
>
> Please review our available documentation for general assistance, and feel free to share your time zone so we can provide more relevant details.
>
> Best regards,
> Customer Support Team

#### SYN-16 — General: Waiting-on-customer status

> Hello Amara Johnson,
>
> Thank you for reaching out and letting us know that you have already provided the requested information.
>
> Please rest assured that you do not need to resend any sensitive documents or personal data.
>
> As a next step, please keep this email thread open so an agent can review the information you previously provided and update the ticket status accordingly.
>
> Best regards,
> Customer Support Team

### Current status and remaining issues

- The v5 synthetic response score is 16.83/20 (84.17%), so the stated 80% target is met under the documented six-criterion rubric. Ten of the 20 cases still miss at least one criterion; this is not a claim that every response passed.
- Remaining live-response risks include unsupported actions/timing claims, sensitive-data requests, and speculative financial or authentication explanations. The model still violated the explicit no-promises guidance in multiple cases.
- The official category/priority evaluation is still blocked on the lead's labelled 20-ticket dataset. The lead's 10 malicious samples are also still pending. Synthetic reply-quality results do not replace either input set.
