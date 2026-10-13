import ProfileLayout from "@/views/Profile/ProfileLayout";
import PartsRequests from "@/views/Profile/PartsRequests";

const PartsRequestsPage = () => {
  return (
    <ProfileLayout activeMenu="Parts Requests">
      <PartsRequests />
    </ProfileLayout>
  );
};

export default PartsRequestsPage;
