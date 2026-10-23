import { useState } from "react";

import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { Notice } from "../../components/ui/Notice";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { Stepper } from "../../components/ui/Stepper";
import { DraftReview } from "../../features/scenarios/DraftReview";
import type { ParseTextResponse } from "../../lib/api/types";
import { createScenario, parseScenarioText } from "../../lib/api/scenarios";
import { errorMessage } from "../../lib/format";
import { href, navigate } from "../../lib/router";
import { usePageTitle } from "../../lib/usePageTitle";
import styles from "./pages.module.css";

const MAX_CHARS = 4000;

const EXAMPLES = [
  "A simulated flood affects 12 people; one route is closed.",
  "Two synthetic sites need medical help after a storm. One has 20 people and the shelter is nearly full.",
  "A fictional landslide blocks the only road to a village of 8 people who need aid kits.",
];

export function CreatePage() {
  usePageTitle("Create scenario");
  const [text, setText] = useState(EXAMPLES[0] ?? "");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ParseTextResponse | null>(null);
  const [draftText, setDraftText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tooLong = text.length > MAX_CHARS;
  const textError = tooLong
    ? `Descriptions are limited to ${MAX_CHARS} characters. Shorten it by ${text.length - MAX_CHARS}.`
    : text.trim() === ""
      ? "Describe the situation first."
      : null;

  const parse = () => {
    if (textError) return;
    setParsing(true);
    setError(null);
    parseScenarioText(text)
      .then((response) => {
        setResult(response);
        setDraftText(JSON.stringify(response.draft, null, 2));
      })
      .catch((err: unknown) => setError(errorMessage(err, "The description could not be parsed.")))
      .finally(() => setParsing(false));
  };

  const save = () => {
    let draft: Record<string, unknown>;
    try {
      draft = JSON.parse(draftText) as Record<string, unknown>;
    } catch {
      setError("The draft JSON is not valid. Fix it in the advanced editor before saving.");
      return;
    }
    draft.id = `scenario-user-${Date.now()}`;
    setSaving(true);
    setError(null);
    createScenario(draft)
      .then((scenario) => navigate({ name: "scenario", id: scenario.id }))
      .catch((err: unknown) => {
        setError(errorMessage(err, "The scenario could not be saved."));
        setSaving(false);
      });
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Create"
        title="Create a scenario from a description"
        description="The parser turns plain text into a draft you review. It never starts a run and never contacts emergency services."
        crumbs={[{ label: "Scenarios", href: href({ name: "home" }) }, { label: "Create" }]}
      />
      <Panel title="Progress">
        <Stepper
          label="Scenario creation steps"
          steps={[
            { id: "describe", label: "Describe", hint: "Write a synthetic situation", state: result ? "done" : "current" },
            { id: "review", label: "Review draft", hint: "Check every field", state: result ? "current" : "upcoming" },
            { id: "save", label: "Save and run", hint: "Validated by the backend", state: "upcoming" },
          ]}
        />
      </Panel>

      <div className={styles.dashboard}>
        <div className={styles.side}>
          <Panel title="1. Describe the situation" description="Offline mock parser: no API key and no network model are used.">
            <Field
              label="Situation"
              hint="Use fictional details only. Do not paste real names, addresses or incident data."
              error={textError}
            >
              {(props) => (
                <textarea {...props} value={text} onChange={(event) => setText(event.target.value)} rows={6} />
              )}
            </Field>
            <p className={`${styles.counter} ${tooLong ? styles.counterOver : ""}`}>
              {text.length} / {MAX_CHARS}
            </p>
            <div>
              <p className="visually-hidden">Example descriptions</p>
              <div className={styles.examples}>
                {EXAMPLES.map((example, index) => (
                  <Button key={example} size="sm" onClick={() => setText(example)}>
                    Example {index + 1}
                  </Button>
                ))}
              </div>
            </div>
            <Button variant="primary" busy={parsing} disabled={Boolean(textError)} onClick={parse}>
              {parsing ? "Drafting…" : result ? "Draft again" : "Draft scenario"}
            </Button>
            {error ? (
              <Notice tone="danger" title="Something went wrong" onDismiss={() => setError(null)}>
                {error}
              </Notice>
            ) : null}
          </Panel>
        </div>
        <div className={styles.center}>
          <Panel title="2. Review the draft" description="Nothing is saved until you confirm.">
            {result ? (
              <DraftReview
                result={result}
                draftText={draftText}
                onDraftTextChange={setDraftText}
                saving={saving}
                onConfirm={save}
                onDiscard={() => {
                  setResult(null);
                  setDraftText("");
                }}
              />
            ) : (
              <p className={styles.placeholder}>
                Your draft appears here after you press “Draft scenario”.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
