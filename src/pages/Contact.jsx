import { Mail, Clock, Send } from "lucide-react";

const Contact = () => {
  return (
    <main className="bg-background" >
      <section className="px-2">
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

            {/* Form Card */}
            <div className="rounded-3xl border border-border bg-card/40 backdrop-blur-md p-6 sm:p-8 md:p-9 shadow-sm">
              <form className="space-y-6">

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name
                  </label>

                  <input
                    type="text"
                    placeholder="Enter your full name"
                    className="w-full rounded-2xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email Address
                  </label>

                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="w-full rounded-2xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Subject
                  </label>

                  <input
                    type="text"
                    placeholder="Enter subject"
                    className="w-full rounded-2xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Message
                  </label>

                  <textarea
                    rows={5}
                    placeholder="Write your message..."
                    className="w-full rounded-2xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all focus:border-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
                >
                  <Send className="h-4 w-4" />

                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;