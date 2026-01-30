import { createOrgAction } from "./actions";

export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Create your organization</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is your workspace. You can invite teammates later.
      </p>

      <form action={createOrgAction} className="mt-6 space-y-4">
        <input
          name="orgName"
          placeholder="Acme Inc."
          className="w-full rounded-md border px-3 py-2"
        />
        <button className="w-full rounded-md border px-3 py-2">
          Create
        </button>
      </form>
    </main>
  );
}