import { useState } from "react";
import { Mail, Clock, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Contact = () => {

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

    const { error } = await supabase
      .from("contact_messages")
      .insert([
        {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        },
      ]);

    setLoading(false);

    if (error) {

      console.error(error);

      setSubmitStatus({
        type: "error",
        message: "Failed to send message. Please try again.",
      });

      return;
    }

    setSubmitStatus({
      type: "success",
      message: "Your message has been sent successfully.",
    });

    setFormData({
      full_name: "",
      email: "",
      subject: "",
      message: "",
    });

    setErrors({});
  };

  return (
    <main className="bg-background" >
      <section className="px-2 pt-3">
        <div className="mx-auto px-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div className="space-y-10">

              <div className="mb-4">
                <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-2">
                  Get In Touch
                </div>

                <h2 className="text-3xl md:text-[2.5rem] font-bold text-foreground leading-tight mt-4 mb-4">
                  We'd love to hear from you
                </h2>

                <p className="text-base sm:text-lg text-muted-foreground leading-8 mb-3">
                  Whether you have questions about bookings, hosting, payments, platform support,
                  or suggestions to improve ParkMitra, our team would love to hear from you 
                  and is always here to help.
                </p>

                <p className="text-base sm:text-lg text-muted-foreground leading-8 mb-3">
                  Please note that we do not directly operate parking
                  facilities listed on the platform and may be unable to
                  provide additional information about individual parking
                  locations.
                </p>
              </div>

              <div className="space-y-8 pt-2">

                <div className="flex items-start gap-4 mb-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Email Support
                    </h3>

                    <p className="text-muted-foreground">
                      support@parkmitra.com
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      Business Hours
                    </h3>

                    <p className="text-muted-foreground">
                      Monday - Saturday
                    </p>

                    <p className="text-muted-foreground">
                      9:00 AM - 6:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card/40 backdrop-blur-md p-6 sm:p-8 md:p-9 shadow-sm">
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
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;