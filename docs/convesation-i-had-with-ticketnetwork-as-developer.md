CatalogAPI Integration — Questions on Order Placement, Pricing & Fulfillment (Account: ZX7910-STORE)
Inbox
Summarize this email

Mohammed Arif <work.mohammedarif@gmail.com>
Sat, Aug 8, 4:34 PM (5 days ago)
to IntegrationSupport

Hi TicketNetwork Integration Support team,

We're currently integrating with the CatalogAPI (Sandbox, Account ZX7910-STORE, TestApplication, WCID 12498) to build a ticket reselling platform. We've successfully authenticated and are pulling categories, events, performers, and venues.

As we move into checkout and order handling, we have a few questions we'd like to clarify before continuing development:

1. Order placement: CatalogAPI appears to be read-only reference/catalog data. Which API do we use to actually place, reserve, or purchase a ticket on behalf of a customer once they've completed checkout on our site?

2. Pricing: We don't see pricing/inventory-availability data in the endpoints we currently have access to. Which endpoint or API provides real-time price and availability for a specific ticket listing?

3. Fulfillment & delivery: Once an order is placed, how is the ticket delivered to the end customer — e-ticket, transfer, physical shipping, or a mix depending on the event? Is this something your API communicates back to us, or handled separately?

4. Order status & webhooks: Is there a way to receive order status updates (confirmed, fulfilled, cancelled) via webhook, or do we need to poll an endpoint?

5. Cancellations & refunds: What's the process if a customer needs a refund or an event is cancelled/postponed? Is this handled through an API call, or manually through TicketNetwork support?

6. Commission/settlement: How does settlement work on our end — do we collect full payment from the customer and remit TicketNetwork's portion, or does TicketNetwork handle payment collection and pay out our commission separately?

7. Additional subscriptions needed: Given the above, which additional APIs/products should we subscribe to in the DevPortal to support a full browse-to-purchase flow?

8. Production access: What's the process and typical timeline for moving from Sandbox (Trial tier) to Production access once we're ready to launch?

9. Rate limits at scale: Our current Trial tier is 60 requests/min. What are the options for higher throughput in Production, and is there a recommended caching/sync policy to stay within limits?

Thanks in advance for the guidance.

Best regards,
Mohammad Arif

Yuliya Biziuk <Yuliya.Biziuk@ticketnetwork.com>
Sun, Aug 9, 4:46 AM (4 days ago)
to Ian, me, TN-IntegrationSupport

Hi Mohammed, 

Looks like need Mercury API. @Ian Schultz

Yuliya Biziuk

API Integration Lead/Front-End Developer

 

From: Mohammed Arif <work.mohammedarif@gmail.com>
Sent: Saturday, August 8, 2026 6:34 AM
To: TN-IntegrationSupport <IntegrationSupport@ticketnetwork.com>
Subject: CatalogAPI Integration — Questions on Order Placement, Pricing & Fulfillment (Account: ZX7910-STORE)
 
Some people who received this message don't often get email from work.mohammedarif@gmail.com. Learn why this is important
This communication, including attachments, may contain information that is confidential and constitutes non-public information intended to be conveyed only to the designated recipient(s). If the reader or recipient of this communication is not the intended recipient, an employee or agent of the intended recipient who is responsible for delivering it to the intended recipient, or you believe that you have received this communication in error, please notify the sender immediately by return e-mail and promptly delete this e-mail, including attachments without reading or saving them in any manner. The unauthorized use, dissemination, distribution, or reproduction of this e-mail, including attachments, is prohibited and may be unlawful. Receipt by anyone other than the intended recipient(s) is not a waiver of any attorney/client or other privilege.
...

[Message clipped]  View entire message

Mohammed Arif <work.mohammedarif@gmail.com>
Mon, Aug 10, 11:27 AM (3 days ago)
to Yuliya

Hi Yuliya,

Thanks for pointing us to Mercury — that makes sense given we need real order placement, not just catalog browsing.

Could you help us with next steps to get access?

1. How do we get subscribed/onboarded to Mercury Web Services under our existing account (ZX7910-STORE)? Is this an additional subscription in the DevPortal, or a separate onboarding process?
2. Is there technical documentation for Mercury (endpoints, request/response formats, authentication) similar to what we have for CatalogAPI, so we can start integration planning?
3. Does Mercury also provide real-time pricing/availability data, or is that still a separate endpoint from order placement?
4. For the questions from our original email that weren't yet addressed — could you confirm whether these apply to Mercury specifically:
   - Order status updates: webhook available, or do we need to poll?
   - Cancellations/refunds: handled via API call, or through TicketNetwork support?
   - Settlement: do we collect full payment from the customer and pay TicketNetwork wholesale cost, or is payment handled differently?
5. Is Mercury available in Sandbox for testing before we request Production access, the same way CatalogAPI is?


Thanks again for the help,
Mohammed Arif

Ian Schultz <Ian.Schultz@ticketnetwork.com>
Mon, Aug 10, 6:47 PM (3 days ago)
to TN-IntegrationSupport, me

Hi Mohammed,

 

Are you looking to handle fulfillment and act as Merchant of Record, or are you looking for TicketNetwork to handle that and leverage our checkout solution?

 

From: Mohammed Arif <work.mohammedarif@gmail.com>
Sent: Saturday, August 8, 2026 6:34 AM
To: TN-IntegrationSupport <IntegrationSupport@ticketnetwork.com>
Subject: CatalogAPI Integration — Questions on Order Placement, Pricing & Fulfillment (Account: ZX7910-STORE)

 

Some people who received this message don't often get email from work.mohammedarif@gmail.com. Learn why this is important

Hi TicketNetwork Integration Support team,

This communication, including attachments, may contain information that is confidential and constitutes non-public information intended to be conveyed only to the designated recipient(s). If the reader or recipient of this communication is not the intended recipient, an employee or agent of the intended recipient who is responsible for delivering it to the intended recipient, or you believe that you have received this communication in error, please notify the sender immediately by return e-mail and promptly delete this e-mail, including attachments without reading or saving them in any manner. The unauthorized use, dissemination, distribution, or reproduction of this e-mail, including attachments, is prohibited and may be unlawful. Receipt by anyone other than the intended recipient(s) is not a waiver of any attorney/client or other privilege.

Mohammed Arif <work.mohammedarif@gmail.com>
Tue, Aug 11, 11:47 AM (2 days ago)
to Ian

Hi Ian,

Thanks for the clarification.

To clarify, we're looking for Option B. Our client is a third-party reseller, and we would like to use the CatalogAPI/Mercury data to display venues, events, categories, and related information on our site, while having TicketNetwork handle the checkout and payment collection as the Merchant of Record.

We would then like sales generated through our platform to be properly attributed to our client and understand how the associated commission would be handled.

Given that, could you please clarify a few points so we can plan the integration correctly?

Checkout handoff: What does the checkout flow look like technically? Is it a redirect to a TicketNetwork-hosted checkout page, an embedded widget/iframe, or another method? Is there a way to pass our client's affiliate/reseller ID so sales are correctly attributed?

Commission tracking: How are attributed sales and commissions tracked and reported? Is there an API/webhook we can use, or would this be provided through periodic reports/statements?

Commission structure: How is the commission calculated? Is it a flat rate, tiered, or does it vary by event/category?

Order status: After a customer completes a purchase through the TicketNetwork checkout, is there any order-status information we can access from our side—for example, to show a purchased/order-history status to our users—or does that information remain entirely within TicketNetwork's system?

Sandbox: Can we test this checkout flow end-to-end in Sandbox, or would Production access be required to test the complete flow?

Thanks again for the guidance. This will help us scope the integration correctly before we continue development.

Best regards,
Mohammed Arif


Ian Schultz
Aug 11, 2026, 7:29 PM (2 days ago)
to me

Hi Mohammed,

 

See answers and comments below in red

 

From: Mohammed Arif <work.mohammedarif@gmail.com>
Sent: Tuesday, August 11, 2026 1:47 AM
To: Ian Schultz <Ian.Schultz@ticketnetwork.com>
Subject: Re: CatalogAPI Integration — Questions on Order Placement, Pricing & Fulfillment (Account: ZX7910-STORE)

 

You don't often get email from work.mohammedarif@gmail.com. Learn why this is important

Hi Ian,

Thanks for the clarification.

To clarify, we're looking for Option B. Our client is a third-party reseller, and we would like to use the CatalogAPI/Mercury data to display venues, events, categories, and related information on our site, while having TicketNetwork handle the checkout and payment collection as the Merchant of Record. To be clear, Mercury is a B2B API that allows the client to act as Merchant of Record and handle checkout themselves. With using Mercury, you would not be able to leverage TicketNetwork. You can however use Catalog and our own hosted checkout application.

We would then like sales generated through our platform to be properly attributed to our client and understand how the associated commission would be handled.

Given that, could you please clarify a few points so we can plan the integration correctly?

Checkout handoff: What does the checkout flow look like technically? Is it a redirect to a TicketNetwork-hosted checkout page, an embedded widget/iframe, or another method? Is there a way to pass our client's affiliate/reseller ID so sales are correctly attributed? With our Private Label platform, you would drive traffic to a TicketNetwork hosted checkout. We handle merchant processing, chargebacks, fraud review, fulfillment, etc. You can pass UTM parameters to help with tracking and attribution, as well as placing GTM tags within the flow to help with conversion tracking.
Commission tracking: How are attributed sales and commissions tracked and reported? Is there an API/webhook we can use, or would this be provided through periodic reports/statements? We have a sales reporting dashboard that we give you access to.
Commission structure: How is the commission calculated? Is it a flat rate, tiered, or does it vary by event/category? All inventory is made available to you at a wholesale rate. From there, you decide what you want your markup or margin to look like. TicketNetwork collects 7.5% on the wholesale rate of the ticket and you earn the balance as commission. Here is an example:
Wholesale: $100

Markup: 20%

Customer Price: $120

TN Retain: $7.50

Commission: $12.50

Order status: After a customer completes a purchase through the TicketNetwork checkout, is there any order-status information we can access from our side—for example, to show a purchased/order-history status to our users—or does that information remain entirely within TicketNetwork's system? All customers receive an order confirmation as well as email receipt. Both communications are white labeled to the brand. Since you are not facilitating the fulfillment of the order, there is no communication provided or action required on your part.
Sandbox: Can we test this checkout flow end-to-end in Sandbox, or would Production access be required to test the complete flow? Once an NDA is signed we can provide you with Sandbox access.
Thanks again for the guidance. This will help us scope the integration correctly before we continue development.

Best regards,
Mohammed Arif
