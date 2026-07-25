import { AcceptInvitationView } from "./_components/accept-invitation-view";

type AcceptInvitationPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function AcceptInvitationPage({
  searchParams,
}: AcceptInvitationPageProps) {
  const { token = "" } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
      <section className="w-full max-w-xl rounded-xl border bg-white p-8 shadow-sm">
        <AcceptInvitationView token={token} />
      </section>
    </main>
  );
}
