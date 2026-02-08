import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";

export default async function ClientRedirectPage({
  params
}: {
  params: { clientId: string };
}) {
  try {
    await requireUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }

  redirect(`/home/${params.clientId}`);
}
