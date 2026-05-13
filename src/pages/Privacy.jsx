import PrivacyContent from "@/components/TermsAndPrivacyContent";

const sections = [
  {
    title: "Introduction",
    paragraphs: [
      "ParkMitra respects your privacy and is committed to protecting your personal information and ensuring transparency in how your data is collected, used, and stored.",
      "This Privacy Policy explains what information we collect, why we collect it, and how we use it when you access or use the ParkMitra platform.",
      "By using ParkMitra, you agree to the collection and processing of your information in accordance with this Privacy Policy.",
    ],
  },
  {
    title: "Information We Collect",
    paragraphs: [
      "We may collect personal and non-personal information to provide and improve our services.",
    ],
    bullets: [
      "Full name, email address, and contact details.",
      "Booking, payment, and transaction information.",
      "Vehicle details and parking preferences.",
      "Location data and platform usage analytics.",
      "Technical information such as browser type, IP address, and device information.",
    ],
  },
  {
    title: "How We Use Your Information",
    paragraphs: [
      "Your information is used to operate, maintain, and improve the ParkMitra platform and user experience.",
    ],
    bullets: [
      "To process parking bookings and payments securely.",
      "To provide customer support and respond to enquiries.",
      "To improve platform performance, features, and security.",
      "To send booking confirmations, updates, and important notifications.",
      "To prevent fraudulent activity and maintain platform safety.",
    ],
  },
  {
    title: "Data Sharing & Security",
    paragraphs: [
      "ParkMitra does not sell your personal information to third parties.",
      "We may share limited information with trusted service providers only when necessary to process payments, complete bookings, or comply with legal obligations.",
      "We implement reasonable technical and security measures to protect user data from unauthorized access, misuse, or disclosure.",
    ],
  },
  {
    title: "Cookies & Analytics",
    paragraphs: [
      "ParkMitra may use cookies and analytics technologies to improve website functionality, remember user preferences, and understand how users interact with the platform.",
      "Users may disable cookies through browser settings, though certain features of the platform may not function properly as a result.",
    ],
  },
  {
    title: "User Rights",
    paragraphs: [
      "You may request access, correction, or deletion of your personal information at any time, subject to applicable legal requirements.",
      "Users may also opt out of non-essential communications and request clarification regarding how their information is processed.",
    ],
  },
  {
    title: "Policy Updates",
    paragraphs: [
      "ParkMitra reserves the right to update or modify this Privacy Policy at any time.",
      "Any updates will become effective immediately after being published on the platform. Continued use of ParkMitra after changes are posted constitutes acceptance of the revised policy.",
    ],
  },
];

const Privacy = () => {
  return (
    <PrivacyContent
      badge="Privacy & Security"
      title="Privacy Policy"
      description="Your privacy matters to us. This Privacy Policy explains how ParkMitra collects, uses, protects, and manages your information while you use our platform."
      sections={sections}
      updatedAt="May 2026"
    />
  );
};

export default Privacy;