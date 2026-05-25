import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import HostListingPage from "@/components/host-listing/HostListingPage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock3, CheckCircle2, CircleX, PlusCircle } from "lucide-react";

type View =
  | "home"
  | "pending"
  | "completed"
  | "rejected"
  | "new-space";

const HostSpacesDashboard = () => {
  const { user } = useAuth();
  const [view, setView] = useState<View>("home");
  const [spaces, setSpaces] = useState<any[]>([]);
  const [editingSpace, setEditingSpace] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadSpaces();
    }
  }, [user]);

  const loadSpaces = async () => {
    const { data } = await supabase
      .from("parking_spaces")
      .select("*")
      .eq("user_id", user?.id);

    setSpaces(data || []);
  };

  const handleReapply = async (space: any) => {

    const { data: slots } = await supabase
      .from("parking_slots")
      .select("vehicle_type")
      .eq("space_id", space.id);

    const carSlots = slots?.filter(
      x => x.vehicle_type === "car"
    ).length || 0;

    const bikeSlots = slots?.filter(
      x => x.vehicle_type === "bike"
    ).length || 0;

    setEditingSpace({
      ...space,
      carSlots,
      bikeSlots
    });

    setView("new-space");
  };

  const pending = spaces.filter(
    x => x.listing_status === "pending"
  );

  const completed = spaces.filter(
    x => x.listing_status === "approved"
  );

  const rejected = spaces.filter(
    x => x.listing_status === "rejected"
  );

  const currentData =
    view === "pending"
      ? pending
      : view === "completed"
        ? completed
        : rejected;

  const renderHome = () => {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          onClick={() => setView("pending")}
          className="cursor-pointer group min-h-[180px] transition-all hover:border-yellow-500/60 hover:-translate-y-1"
        >
          <CardContent className="h-full p-7 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  Pending
                </p>

                <p className="text-muted-foreground text-sm mt-1">
                  Awaiting admin review
                </p>
              </div>

              <Clock3 className="w-10 h-10 text-yellow-500 group-hover:scale-110 transition"/>
            </div>

            <div className="text-3xl font-bold">
              {pending.length}
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setView("completed")}
          className="cursor-pointer group min-h-[180px] transition-all hover:border-green-500/60 hover:-translate-y-1"
        >
          <CardContent className="h-full p-7 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  Completed
                </p>

                <p className="text-muted-foreground text-sm mt-1">
                  Approved listings
                </p>
              </div>

              <CheckCircle2 className="w-10 h-10 text-green-500 group-hover:scale-110 transition"/>
            </div>

            <div className="text-3xl font-bold">
              {completed.length}
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => setView("rejected")}
          className="cursor-pointer group min-h-[180px] transition-all hover:border-red-500/60 hover:-translate-y-1"
        >
          <CardContent className="h-full p-7 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  Rejected
                </p>

                <p className="ext-muted-foreground text-sm mt-1">
                  Needs correction
                </p>
              </div>

              <CircleX className="w-10 h-10 text-red-500 group-hover:scale-110 transition"/>
            </div>

            <div className="text-3xl font-bold">
              {rejected.length}
            </div>
          </CardContent>
        </Card>


        <Card
          onClick={() => setView("new-space")}
          className="cursor-pointer group min-h-[180px] transition-all 
            hover:border-primary hover:-translate-y-1"
        >
          <CardContent className="h-full p-7 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  Apply New Space
                </p>

                <p className="text-muted-foreground text-sm mt-1">
                  Create another listing
                </p>
              </div>

              <PlusCircle className="w-10 h-10 text-primary group-hover:scale-110 transition"/>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSpaces = () => {
    return (
      <div className="space-y-5">

        {currentData.length === 0 && (
          <Card>
            <CardContent className="h-[180px] flex items-center justify-center text-muted-foreground">
              No spaces found
            </CardContent>
          </Card>
        )}

        {currentData.map(space => (
          <Card key={space.id}>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">
                {space.title}
              </h3>

              <p className="text-muted-foreground text-s mb-4">
                {space.address}
              </p>

              {view === "rejected" &&
                space.rejection_reason && (
                  <div>
                    <div className="text-sm mb-4">
                      <span className="font-medium">
                        Reason:
                      </span>

                      {" "}
                      {space.rejection_reason}

                    </div>

                    <Button
                      onClick={() => handleReapply(space)}
                    >
                      Reapply
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 min-h-[70vh]">
      <div className="flex items-center gap-2 mb-10 text-sm">
        <button
          onClick={() => setView("home")}
          className="text-primary hover:underline"
        >
          List-your-space
        </button>

        {view !== "home" && (
          <>
            <span>{">"}</span>

            <span className="font-medium text-foreground">
              {(view === "new-space" && editingSpace)
                ? "reapply"
                : view
              }
            </span>
          </>
        )}
      </div>

      {view === "home"
        ? renderHome()
        : view === "new-space"
          ? <HostListingPage editSpace={editingSpace} />
          : renderSpaces()
      }
    </div>
  )
};

export default HostSpacesDashboard;