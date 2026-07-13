import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function AdvertiserRegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" audience="advertiser" />
    </Suspense>
  );
}
