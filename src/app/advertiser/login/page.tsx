import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function AdvertiserLoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" audience="advertiser" />
    </Suspense>
  );
}
