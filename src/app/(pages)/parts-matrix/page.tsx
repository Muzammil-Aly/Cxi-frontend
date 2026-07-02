import ProfileLayout from "@/views/Profile/ProfileLayout";
import PartsMatrix from "@/views/Profile/PartsMatrix";

const PartsMatrixPage = () => {
  return (
    <ProfileLayout activeMenu="Parts Matrix">
      <PartsMatrix />
    </ProfileLayout>
  );
};

export default PartsMatrixPage;
