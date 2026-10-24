import { useSession } from "@/entities/session";
import { LoginForm } from "@/features/auth";
import { ProfileForm } from "@/features/edit-profile";
import { useGoBack } from "@/shared/lib";
import { SiteLayout } from "@/widgets/site-layout";

/** /perfil: iniciar sesión si no hay sesión, o los datos de la cuenta si la hay. */
export function ProfilePage() {
  const { user, isTeam } = useSession();
  const goBack = useGoBack(isTeam ? "/panel" : "/");
  return <SiteLayout inProfile>{user ? <ProfileForm onBack={goBack} /> : <LoginForm />}</SiteLayout>;
}
