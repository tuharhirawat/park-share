import TermsContent from "@/components/TermsAndPrivacyContent";

const sections = [
  {
    title: "Introduction",
    paragraphs: [
      "ParkMitra is a peer-to-peer parking marketplace that connects travelers with parking space owners.",
      "By using our services, you acknowledge that you have read, understood, and agreed to these Terms & Conditions.",
      "We reserve the right to modify, update, suspend, or discontinue any part of the platform at any time without prior notice.",
    ],
  },
  {
    title: "Eligibility",
    paragraphs: [
      "Users must provide accurate account information and comply with all applicable laws while using ParkMitra.",
    ],
    bullets: [
      "Users are responsible for maintaining account confidentiality.",
      "False or misleading information is strictly prohibited.",
      "You must be legally authorized to list or use parking spaces.",
      "Fraudulent activity may result in account suspension or permanent bans.",
    ],
  },
  {
    title: "Bookings & Payments",
    paragraphs: [
      "ParkMitra facilitates parking bookings between hosts and travelers.",
      "Availability, pricing, cancellations, booking extensions, and parking rules may vary depending on the listed parking space.",
      "All payments must be completed securely through the platform.",
    ],
  },
  {
    title: "Liability",
    paragraphs: [
      "ParkMitra acts solely as a platform connecting parking hosts and travelers.",
      "We do not directly own, supervise, or manage parking spaces listed on the platform.",
      "Users are responsible for their own actions, bookings, vehicle safety, and compliance with local laws.",
    ],
  },
  {
    title: "Privacy & Data",
    paragraphs: [
      "By using ParkMitra, you consent to the collection and use of personal information in accordance with our Privacy Policy.",
      "While we take reasonable measures to protect user information, we cannot guarantee complete security of online systems.",
    ],
  },
  {
    title: "Updates to Terms",
    paragraphs: [
      "ParkMitra reserves the right to modify these Terms & Conditions at any time.",
      "Continued use of the platform after updates are published constitutes acceptance of the revised terms.",
    ],
  },
];

const Terms = () => {
  return (
    <TermsContent
      badge="Legal Information"
      title="Terms & Conditions"
      description="Please read these Terms & Conditions carefully before using ParkMitra. By accessing or using our platform, you agree to comply with these terms, policies, and guidelines."
      sections={sections}
      updatedAt="May 2026"
    />
  );
};

export default Terms;