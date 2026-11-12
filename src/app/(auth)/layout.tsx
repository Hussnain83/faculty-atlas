import { AuthStage } from "@/components/auth/AuthStage";
import { Icon } from "@/components/ui/Icon";
import "./auth.css";

/** Sign-in, activation and reset share this split screen: 3D stage on the left, the form card on the right. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const demo = process.env.FA_DEMO_MODE === "true";
  return (
    <div className="auth">
      <AuthStage />
      <div className="auth-side">
        {children}
        <p className="auth-fine">
          <Icon name={demo ? "info" : "lock"} />
          {demo
            ? "Demo mode: sign-in codes appear on screen and no email is sent."
            : "Need help signing in? Contact research.office@northfield.edu."}
        </p>
      </div>
    </div>
  );
}
