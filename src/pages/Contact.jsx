import { useState } from "react";
import { Mail, Clock, Phone } from "lucide-react";
import dictionary from "@/constants/dictionary";

const Contact = () => {
  const { page, support, messages } = dictionary.contact;

  /*
   * TODO: Re-enable the contact form once the public contact API
   * has proper abuse protection implemented.
   *
   * Required protection before re-enabling:
   * - Backend rate limiting for /api/Contact/Submit
   * - Server-side maximum input lengths
   * - Honeypot / bot protection
   * - Consider CAPTCHA/Cloudflare Turnstile if spam becomes an issue
   *
   * The existing form implementation has intentionally been kept
   * commented out below so it can be restored later.
   */

  // TODO: Restore form state when the contact form is re-enabled.
  /*
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState({
    type: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    setErrors({
      ...errors,
      [name]: "",
    });

    setSubmitStatus({
      type: "",
      message: "",
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    } else if (formData.full_name.trim().length < 5) {
      newErrors.full_name = "Name must be at least 5 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required";
    } else if (formData.subject.trim().length < 5) {
      newErrors.subject = "Subject must be at least 5 characters";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    setSubmitStatus({
      type: "",
      message: "",
    });

    try {
      await api.post("/Contact/Submit", {
        fullName: formData.full_name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      setSubmitStatus({
        type: "success",
        message: messages.success,
      });

      setFormData({
        full_name: "",
        email: "",
        subject: "",
        message: "",
      });

      setErrors({});
    } catch (err) {
      console.error(err);

      const resp = err?.response?.data;

      if (resp?.fieldErrors) {
        setErrors({
          full_name: resp.fieldErrors.fullName,
          email: resp.fieldErrors.email,
          subject: resp.fieldErrors.subject,
          message: resp.fieldErrors.message,
        });
      }

      setSubmitStatus({
        type: "error",
        message: resp?.message || messages.error,
      });
    } finally {
      setLoading(false);
    }
  };
  */

  return (
    <main className="min-h-[calc(100vh-72px)] bg-background">
      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-10 lg:gap-16">
            <div className="min-w-0">
              <div className="max-w-xl">
                <div className="mb-5 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  {page.badge}
                </div>

                <h1 className="max-w-lg text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {page.title}
                </h1>

                <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  {page.description}
                </p>

                <div className="mt-6 rounded-2xl border border-border bg-card/40 px-5 py-4">
                  <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                    {page.notice}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form is temporarily disabled */}
            {/* <div className="rounded-3xl border border-border bg-card/40 backdrop-blur-md p-6 sm:p-8 md:p-9 shadow-sm">
              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name
                  </label>

                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-border bg-white px-5 py-4 text-black placeholder:text-gray-500 caret-black outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />

                  {errors.full_name && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.full_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    className="w-full rounded-2xl border border-border bg-white px-5 py-4 text-black placeholder:text-gray-500 caret-black outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />

                  {errors.email && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Enter subject"
                    className="w-full rounded-2xl border border-border bg-white px-5 py-4 text-black placeholder:text-gray-500 caret-black outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />

                  {errors.subject && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Message
                  </label>

                  <textarea
                    rows={5}
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Write your message..."
                    className="w-full resize-none rounded-2xl border border-border bg-white px-5 py-4 text-black placeholder:text-gray-500 caret-black outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />

                  {errors.message && (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </button>

                {submitStatus.message && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      submitStatus.type === "success"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/20 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {submitStatus.message}
                  </div>
                )}
              </form>
            </div> */}

            <div className="min-w-0">
              <div className="w-full rounded-3xl border border-border bg-card/50 p-5 shadow-sm backdrop-blur-sm sm:p-7 lg:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                    {support.headline}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                    {support.description}
                  </p>
                </div>

                <div className="space-y-3">
                  <a
                    href={`mailto:${support.email}`}
                    className="group flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">
                        {support.emailHeadline}
                      </p>

                      <p className="mt-0.5 truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary sm:text-base">
                        {support.email}
                      </p>
                    </div>
                  </a>

                  {support.mobileNumber && (
                    <a
                      href={`tel:${support.mobileNumber}`}
                      className="group flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                        <Phone className="h-5 w-5 text-primary" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm text-muted-foreground">
                          {support.mobileHeadline}
                        </p>

                        <p className="mt-0.5 text-sm font-semibold text-foreground transition-colors group-hover:text-primary sm:text-base">
                          {support.mobileNumber}
                        </p>
                      </div>
                    </a>
                  )}

                  <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-border bg-background p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm text-muted-foreground">
                        Business Hours
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-foreground sm:text-base">
                        {support.businessHours?.days || "Monday - Saturday"}
                      </p>

                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {support.businessHours?.hours || "9:00 AM - 6:00 PM"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-center text-xs leading-5 text-muted-foreground sm:text-sm">
                    {support.aim}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/*
      TODO: Contact form temporarily disabled.

      The contact form should remain disabled until the public contact API
      has proper abuse protection implemented.

      Required protection before re-enabling:
      - Backend rate limiting for /api/Contact/Submit
      - Server-side maximum input lengths
      - Honeypot / bot protection
      - Consider CAPTCHA/Cloudflare Turnstile if required

      The previous form implementation is preserved above and can be
      restored once the API is properly protected.
    */}
    </main>
  );
};

export default Contact;