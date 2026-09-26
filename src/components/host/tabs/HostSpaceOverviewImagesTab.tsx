import { Button } from "@/components/ui/button";
import { Space } from "@/types/host";
import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/services/api";

interface HostSpaceOverviewImagesTabProps {
  space: Space;
  onChanged: () => void;
}

const HostSpaceOverviewImagesTab = ({
  space,
  onChanged,
}: HostSpaceOverviewImagesTabProps) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if ((space.imageUrls?.length || 0) + files.length > 5) {
      toast.error("Maximum 5 images per listing");
      return;
    }

    setUploadingImage(true);

    try {
      await Promise.all(
        files.map(async (file) => {
          if (file.size > 5 * 1024 * 1024) {
            toast.error("Each image under 5MB");
            return;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("spaceId", space.id);

          await api.post("/ImageUpload/UploadListingImage", formData);
        })
      );

      toast.success("Images updated!");
      onChanged();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Failed to upload images"
      );
    } finally {
      setUploadingImage(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = space.imageUrls[index];

    if (!imageUrl) return;

    try {
      await api.delete("/ImageUpload/RemoveListingImage", {
        data: {
          spaceId: space.id,
          imageUrl,
        },
      });

      toast.success("Image removed");
      onChanged();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Failed to remove image"
      );
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">
          Photos ({space.imageUrls?.length || 0}/5)
        </h3>

        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={uploadingImage}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImagePlus className="w-3.5 h-3.5" />
          {uploadingImage ? "Uploading..." : "Add Images"}
        </Button>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {space.imageUrls && space.imageUrls.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {space.imageUrls.map((url, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              <img
                src={url}
                alt=""
                className="w-full h-full object-cover"
              />

              <button
                onClick={() => handleRemoveImage(i)}
                className="absolute top-1.5 right-1.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No photos yet — add up to 5 to help renters recognize the space.
        </p>
      )}
    </div>
  );
};

export default HostSpaceOverviewImagesTab;