"use client";

import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <div className="max-w-[48rem] mx-auto px-6 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-neutral-400 hover:text-neutral-600 transition-colors mb-12"
        >
          <span>&larr;</span>
          <span>Back to home</span>
        </Link>

        {/* Header */}
        <h1 className="text-[32px] font-light tracking-tight text-neutral-800 mb-2">
          Privacy Policy
        </h1>
        <p className="text-[13px] text-neutral-400 mb-16">
          Last updated: March 19, 2026
        </p>

        {/* Content */}
        <div className="space-y-14">
          {/* Intro */}
          <section>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              Chicago Intelligence Company (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates an
              AI-powered due diligence and strategic analysis platform. This Privacy Policy describes
              how we collect, use, and protect your information when you use our services.
            </p>
          </section>

          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              1. Information We Collect
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                <span className="text-neutral-600 font-medium">Account Information.</span>{" "}
                When you create an account, we collect your email address and authentication
                credentials through our third-party authentication provider. We do not store
                passwords directly.
              </p>
              <p>
                <span className="text-neutral-600 font-medium">Report Data.</span>{" "}
                When you generate due diligence or strategy reports, we collect the company names,
                addresses, and other inputs you provide. Generated reports are stored to enable
                access to your report history.
              </p>
              <p>
                <span className="text-neutral-600 font-medium">Payment Information.</span>{" "}
                Payment processing is handled entirely by Stripe. We do not store credit card
                numbers, bank account details, or other sensitive financial data on our servers.
                We retain only transaction identifiers for record-keeping.
              </p>
              <p>
                <span className="text-neutral-600 font-medium">Usage Data.</span>{" "}
                We automatically collect basic usage information including pages visited,
                features used, timestamps, browser type, and device information to improve
                our service.
              </p>
            </div>
          </section>

          {/* 2. API Key Handling */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              2. API Key Handling
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                Our platform uses API keys to interact with third-party services for report
                generation. These keys are managed exclusively on the server side and are
                never exposed to client browsers or stored in user-accessible locations.
              </p>
              <p>
                User-provided API keys, if applicable, are used only for the duration of
                a single request session. They are never written to disk, logged, cached,
                or persisted on our servers in any form. Once the request completes, all
                key material is discarded from memory.
              </p>
            </div>
          </section>

          {/* 3. Report Data Retention */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              3. Report Data Retention
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                Generated reports are retained in our database to provide you with ongoing
                access through your dashboard. Reports remain available for as long as your
                account is active.
              </p>
              <p>
                If you delete your account, all associated report data will be permanently
                removed within 30 days. You may also request deletion of individual reports
                at any time by contacting us.
              </p>
            </div>
          </section>

          {/* 4. Cookies & Local Storage */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              4. Cookies & Local Storage
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                We use essential cookies and local storage to maintain your authentication
                session and remember application preferences. These are strictly necessary
                for the platform to function.
              </p>
              <p>
                We do not use advertising cookies, tracking pixels, or cross-site tracking
                technologies. No data is shared with ad networks or data brokers.
              </p>
            </div>
          </section>

          {/* 5. Third-Party Services */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              5. Third-Party Services
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                Our platform integrates with the following third-party services, each governed
                by their own privacy policies:
              </p>
              <ul className="list-none space-y-3 pl-0">
                <li className="pl-4 border-l border-neutral-200">
                  <span className="text-neutral-600 font-medium">Anthropic API (Claude)</span>{" "}
                  &mdash; Powers the AI analysis in our due diligence and strategy reports.
                  Prompts and responses are transmitted securely. Anthropic&rsquo;s data retention
                  and usage policies apply to data processed through their API.
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  <span className="text-neutral-600 font-medium">Open-Meteo</span>{" "}
                  &mdash; Provides real-time weather data for the Chicago area displayed on our
                  landing page. No user data is sent to Open-Meteo.
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  <span className="text-neutral-600 font-medium">Mapbox</span>{" "}
                  &mdash; Renders the interactive map on our landing page. Mapbox may collect
                  anonymized usage telemetry as described in their privacy policy.
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  <span className="text-neutral-600 font-medium">Stripe</span>{" "}
                  &mdash; Processes all payments securely. Chicago Intelligence Company does not
                  have access to your full payment card details.
                </li>
              </ul>
            </div>
          </section>

          {/* 6. Data Security */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              6. Data Security
            </h2>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              We implement industry-standard security measures including encryption in transit
              (TLS), secure authentication flows, and access controls on our infrastructure.
              While no system is completely immune to risk, we take reasonable precautions to
              protect your data from unauthorized access, alteration, or destruction.
            </p>
          </section>

          {/* 7. Your Rights */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              7. Your Rights
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                You have the right to access, correct, or delete your personal data at any time.
                You may also request a copy of the data we hold about you. To exercise any of
                these rights, please contact us at the email address below.
              </p>
              <p>
                If you are a resident of the European Economic Area, California, or another
                jurisdiction with applicable data protection laws, you may have additional rights
                under those laws.
              </p>
            </div>
          </section>

          {/* 8. Changes */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              8. Changes to This Policy
            </h2>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              We may update this Privacy Policy from time to time. If we make material changes,
              we will notify you via email or through a prominent notice on our platform. Your
              continued use of the service after changes are posted constitutes acceptance of the
              updated policy.
            </p>
          </section>

          {/* 9. Contact */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              9. Contact Us
            </h2>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              If you have questions or concerns about this Privacy Policy or our data practices,
              please contact Chicago Intelligence Company at{" "}
              <a
                href="mailto:privacy@chicagointelligence.com"
                className="text-neutral-600 underline underline-offset-2 hover:text-neutral-800 transition-colors"
              >
                privacy@chicagointelligence.com
              </a>
              .
            </p>
          </section>
        </div>

        {/* Footer spacer */}
        <div className="mt-20 pt-8 border-t border-neutral-200">
          <p className="text-[12px] text-neutral-300">
            &copy; 2026 Chicago Intelligence Company. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
