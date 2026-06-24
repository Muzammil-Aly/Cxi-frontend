import ProfileLayout from "@/views/Profile/ProfileLayout";
import GeniePage from "@/views/Genie/GeniePage";

const GenieEmbedPage = () => {
  return (
    <ProfileLayout activeMenu="Open Genie">
      <GeniePage />
    </ProfileLayout>
  );
};

export default GenieEmbedPage;
