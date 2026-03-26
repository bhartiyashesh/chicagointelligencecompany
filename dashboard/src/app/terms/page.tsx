"use client";

import Link from "next/link";

export default function TermsOfService() {
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
          Terms of Service
        </h1>
        <p className="text-[13px] text-neutral-400 mb-16">
          Last updated: March 19, 2026
        </p>

        {/* Content */}
        <div className="space-y-14">
          {/* Intro */}
          <section>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
              Chicago Intelligence Company platform, including all related services, features, and
              content (collectively, the &ldquo;Service&rdquo;). By using the Service, you agree to
              be bound by these Terms.
            </p>
          </section>

          {/* 1. Service Description */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              1. Service Description
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                Chicago Intelligence Company provides an AI-powered due diligence and strategic
                analysis platform. The Service generates reports using artificial intelligence to
                analyze businesses, locations, and market conditions based on publicly available
                data and proprietary analytical models.
              </p>
              <p>
                Our current offerings include comprehensive due diligence reports and strategic
                analysis reports, each designed to assist users in evaluating business opportunities
                and making informed decisions.
              </p>
            </div>
          </section>

          {/* 2. No Investment Advice */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              2. No Investment or Professional Advice
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p className="p-4 border border-neutral-200 rounded-lg bg-white/40">
                <span className="text-neutral-600 font-medium">Important Disclaimer:</span>{" "}
                The reports and analysis provided by Chicago Intelligence Company are for
                informational purposes only. They do not constitute investment advice, financial
                advice, legal advice, tax advice, or any other form of professional counsel.
              </p>
              <p>
                You should not rely solely on our reports when making investment, business, or
                financial decisions. We strongly recommend consulting with qualified professionals
                including licensed financial advisors, attorneys, and accountants before taking
                any action based on information obtained through our Service.
              </p>
              <p>
                Chicago Intelligence Company is not a registered investment advisor, broker-dealer,
                or financial planner. The AI-generated content may contain errors, omissions, or
                outdated information. Past performance indicators referenced in reports do not
                guarantee future results.
              </p>
            </div>
          </section>

          {/* 3. Acceptable Use */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              3. Acceptable Use
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>You agree not to use the Service to:</p>
              <ul className="list-none space-y-2 pl-0">
                <li className="pl-4 border-l border-neutral-200">
                  Violate any applicable laws, regulations, or third-party rights
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  Generate reports for the purpose of harassment, defamation, or competitive
                  sabotage
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  Attempt to reverse-engineer, scrape, or extract the underlying AI models,
                  prompts, or proprietary methodologies
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  Resell, redistribute, or commercially sublicense generated reports without
                  written permission
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  Submit false, misleading, or fraudulent information as report inputs
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  Overload, disrupt, or interfere with the Service or its infrastructure
                </li>
              </ul>
              <p>
                We reserve the right to suspend or terminate accounts that violate these terms
                without prior notice.
              </p>
            </div>
          </section>

          {/* 4. Pricing & Payment */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              4. Pricing & Payment
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>The Service currently offers the following report types:</p>
              <ul className="list-none space-y-2 pl-0">
                <li className="pl-4 border-l border-neutral-200">
                  <span className="text-neutral-600 font-medium">Due Diligence Report</span>{" "}
                  &mdash; $40 per report. A comprehensive AI-generated analysis covering business
                  viability, location assessment, market positioning, risk factors, and strategic
                  recommendations.
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  <span className="text-neutral-600 font-medium">Strategy Report</span>{" "}
                  &mdash; $5 per report. A focused strategic brief analyzing a specific aspect
                  of a business opportunity, market trend, or competitive landscape.
                </li>
              </ul>
              <p>
                All prices are in US dollars and are subject to change with reasonable notice.
                Payments are processed securely through Stripe. You will be charged at the time
                of report generation.
              </p>
            </div>
          </section>

          {/* 5. Refund Policy */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              5. Refund Policy
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                Because reports are generated instantly using AI and delivered immediately, we
                generally do not offer refunds for completed reports. However, we will consider
                refund requests in the following circumstances:
              </p>
              <ul className="list-none space-y-2 pl-0">
                <li className="pl-4 border-l border-neutral-200">
                  The report failed to generate or was substantially incomplete due to a
                  technical error on our end
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  You were charged multiple times for the same report due to a payment
                  processing error
                </li>
                <li className="pl-4 border-l border-neutral-200">
                  The report content is materially unrelated to the inputs you provided
                </li>
              </ul>
              <p>
                Refund requests must be submitted within 7 days of purchase. Please contact us
                with your transaction details and a description of the issue.
              </p>
            </div>
          </section>

          {/* 6. Intellectual Property */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              6. Intellectual Property
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                The Service, including its design, code, AI models, analytical methodologies,
                branding, and all associated intellectual property, is owned by Chicago Intelligence
                Company and protected by applicable intellectual property laws.
              </p>
              <p>
                Upon purchase, you receive a non-exclusive, non-transferable license to use
                generated reports for your own personal or internal business purposes. You may
                share reports with your advisors, partners, or investors as part of your
                decision-making process.
              </p>
              <p>
                You retain ownership of all input data you provide to generate reports. We do not
                claim any intellectual property rights over information you submit.
              </p>
            </div>
          </section>

          {/* 7. Limitation of Liability */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              7. Limitation of Liability
            </h2>
            <div className="space-y-4 text-[15px] text-neutral-400 leading-relaxed">
              <p>
                To the maximum extent permitted by applicable law, Chicago Intelligence Company
                shall not be liable for any indirect, incidental, special, consequential, or
                punitive damages, including but not limited to loss of profits, data, business
                opportunities, or goodwill, arising out of or related to your use of the Service.
              </p>
              <p>
                Our total aggregate liability for any claims arising from or related to the Service
                shall not exceed the amount you paid to Chicago Intelligence Company in the twelve
                (12) months preceding the claim.
              </p>
              <p>
                The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
                warranties of any kind, whether express or implied, including but not limited to
                implied warranties of merchantability, fitness for a particular purpose, accuracy,
                or non-infringement.
              </p>
            </div>
          </section>

          {/* 8. Account Termination */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              8. Account Termination
            </h2>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              You may close your account at any time. We may suspend or terminate your access
              to the Service at our discretion if you violate these Terms or engage in conduct
              that we reasonably believe is harmful to our platform, other users, or third
              parties. Upon termination, your right to use the Service ceases immediately.
              Provisions regarding intellectual property, limitation of liability, and dispute
              resolution survive termination.
            </p>
          </section>

          {/* 9. Governing Law */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              9. Governing Law
            </h2>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the
              State of Illinois, United States, without regard to its conflict of law provisions.
              Any disputes arising under these Terms shall be resolved in the state or federal
              courts located in Cook County, Illinois.
            </p>
          </section>

          {/* 10. Changes */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              10. Changes to These Terms
            </h2>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be
              communicated via email or a prominent notice on the platform. Your continued use of
              the Service after changes are posted constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* 11. Contact */}
          <section>
            <h2 className="text-[20px] font-light tracking-tight text-neutral-700 mb-4">
              11. Contact Us
            </h2>
            <p className="text-[15px] text-neutral-400 leading-relaxed">
              For questions about these Terms, please contact Chicago Intelligence Company at{" "}
              <a
                href="mailto:legal@chicagointelligence.com"
                className="text-neutral-600 underline underline-offset-2 hover:text-neutral-800 transition-colors"
              >
                legal@chicagointelligence.com
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
