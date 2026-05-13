import { Users, MapPin, ShieldCheck, ParkingCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <main className="bg-background">

      {/* Hero Section */}
      <section className="border-b border-border">
        <div className="mx-auto px-5 pb-10">

          <div className="max-w-3xl">

            {/* Badge */}
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              About ParkMitra
            </div>

            {/* Heading */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight mb-8">
              Simplifying parking through community-powered spaces
            </h1>

            {/* Description */}
            <div className="space-y-6 text-base sm:text-lg md:text-xl text-muted-foreground leading-9 max-w-3xl">

              <p>
                ParkMitra is a peer-to-peer parking marketplace that
                connects travelers with local parking space owners.
              </p>

              <p>
                Our mission is to make parking more accessible,
                convenient, and stress-free while helping hosts monetize
                their unused parking spaces.
              </p>

              <p>
                We believe parking should be affordable, convenient,
                and community-driven — reducing traffic congestion and
                improving urban mobility for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="border-y border-border bg-card/20">
        <div className="mx-auto px-5 py-8">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

            {/* Left */}
            <div className="w-full">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                Our Vision
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-8">
                Building the future of shared urban parking
              </h2>

              <div className="space-y-4 text-base text-muted-foreground leading-7">

                <p>
                  Cities continue to struggle with parking shortages,
                  congestion, and wasted private parking capacity.
                </p>

                <p>
                  ParkMitra was created to bridge that gap by enabling
                  people to share unused parking spaces with travelers
                  who need them most.
                </p>

                <p>
                  By leveraging community participation and technology,
                  we aim to create a smarter and more efficient parking
                  ecosystem for modern cities.
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="w-full rounded-3xl border border-border bg-card/50 p-4">

              <div className="grid grid-cols-1 gap-4">

                <div className="rounded-2xl border border-border bg-background/60 p-5 sm:p-6 min-h-[120px] flex flex-col justify-center">
                  <h3 className="text-3xl sm:text-4xl font-bold text-primary mb-3">
                    24/7
                  </h3>

                  <p className="text-muted-foreground">
                    Parking access anytime
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-5 sm:p-6 min-h-[120px] flex flex-col justify-center">
                  <h3 className="text-3xl sm:text-4xl font-bold text-primary mb-3">
                    Secure
                  </h3>

                  <p className="text-muted-foreground">
                    Trusted booking experience
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/60 p-5 sm:p-6 min-h-[120px] flex flex-col justify-center">
                  <h3 className="text-3xl sm:text-4xl font-bold text-primary mb-3">
                    Local
                  </h3>

                  <p className="text-muted-foreground">
                    Community-powered spaces
                  </p>
                </div>

                {/* Future Smart Parking featre */}
                {/* <div className="rounded-2xl border border-border bg-background/60 p-5 sm:p-6 min-h-[120px] flex flex-col justify-center">
                  <h3 className="text-3xl sm:text-4xl font-bold text-primary mb-3">
                    Smart
                  </h3>

                  <p className="text-muted-foreground">
                    Modern parking solutions
                  </p>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 p-5">
        <div className="mx-auto max-w-4xl px-2 sm:px-6 lg:px-8 text-center">

          <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-md p-8 sm:p-10 md:p-14">

            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              Join ParkMitra
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-tight mb-6">
              Start finding and sharing parking spaces today
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground leading-8 max-w-2xl mx-auto mb-10">
              Discover easier parking experiences while helping build
              more connected and efficient communities.
            </p>

            <button
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
              onClick={() => navigate('/search')}
            >
              Explore Parking
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;