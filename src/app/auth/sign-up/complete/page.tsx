import { SignUpCompleteView } from "./sign-up-complete";

type SearchParams = Promise<{
  userType?: string | string[];
  plan?: string | string[];
  billing?: string | string[];
  checkout?: string | string[];
}>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  return (
    <SignUpCompleteView
      userType={firstParam(params.userType)}
      selectedPlan={firstParam(params.plan)}
      selectedBilling={firstParam(params.billing)}
      checkoutIntent={firstParam(params.checkout)}
    />
  );
}
