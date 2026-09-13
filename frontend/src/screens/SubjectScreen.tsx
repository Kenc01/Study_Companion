import { ArrowLeft, Library, Plus } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SubjectScreenProps {
  onBack: () => void;
  onCreate: (name: string) => void;
}

export function SubjectScreen({ onBack, onCreate }: SubjectScreenProps) {
  const [name, setName] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim()) onCreate(name);
  };

  return (
    <form onSubmit={submit} noValidate>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={onBack}
        aria-label="Back to subjects"
      >
        <ArrowLeft aria-hidden="true" />
      </Button>
      <header className="mt-5 flex items-start gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-(--radius-sm) bg-primary-soft text-primary">
          <Library className="size-5.5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-[22px] leading-tight font-semibold sm:text-[26px]">
            Create a Subject
          </h1>
          <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink-soft">
            Add a subject first, then create chapter quizzes inside it.
          </p>
        </div>
      </header>
      <div className="mt-7 max-w-xl rounded-(--radius) border border-line bg-card p-5 shadow-(--shadow-soft) sm:p-6">
        <label htmlFor="subject-name" className="block text-sm font-medium">
          Subject name
        </label>
        <Input
          id="subject-name"
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Research"
          maxLength={90}
          className="mt-2"
        />
        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" size="lg" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={!name.trim()}>
            <Plus aria-hidden="true" /> Create Subject
          </Button>
        </div>
      </div>
    </form>
  );
}
