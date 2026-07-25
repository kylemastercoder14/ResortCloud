import { useFormStatus } from "react-dom";
import { Button } from "./ui/button";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="h-9 w-full" disabled={pending}>
      {pending ? "Creating account..." : "Continue"}
    </Button>
  );
}
