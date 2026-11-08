"use client";

import { useRef, useState } from "react";
import {
  resendPopulationVerification,
  verifyPopulationSubscriber,
  type VerifyPopulationSubscriberResult,
} from "../lib/publicPopulationApi";
import styles from "./PopulationPublicShell.module.css";

export default function PopulationAdditionalVerification({
  channel,
  publicSlug,
  subscriberId,
  accessToken,
  language,
  onVerified,
}: {
  channel: "SMS" | "EMAIL";
  publicSlug: string;
  subscriberId: string;
  accessToken: string;
  language: "fr" | "en";
  onVerified: (result: VerifyPopulationSubscriberResult) => Promise<void>;
}) {
  const [requested, setRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const french = language === "fr";
  const label =
    channel === "EMAIL"
      ? french
        ? "courriel"
        : "email"
      : french
        ? "téléphone"
        : "phone";
  const request = async () => {
    if (inFlight.current || requested || failed) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await resendPopulationVerification(
        publicSlug,
        subscriberId,
        { channel, accessToken },
      );
      if (result.deliveryStatus !== "SENT") throw new Error("delivery");
      setRequested(true);
    } catch {
      // An ambiguous provider outcome must never cause an automatic resend.
      setFailed(true);
      setError(
        french
          ? "La demande n’a pas pu être confirmée. Aucun renvoi automatique ne sera effectué."
          : "The request could not be confirmed. No automatic resend will occur.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const verify = async () => {
    if (inFlight.current || !/^\d{6}$/.test(code)) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await verifyPopulationSubscriber(
        publicSlug,
        subscriberId,
        {
          channel,
          code,
        },
      );
      setCode("");
      await onVerified(result);
    } catch {
      setCode("");
      setError(
        french
          ? "Vérification impossible. Vérifiez le code et son expiration."
          : "Verification failed. Check the code and its expiry.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <section
      aria-label={french ? `Vérifier mon ${label}` : `Verify my ${label}`}
    >
      <h2>{french ? `Vérifier mon ${label}` : `Verify my ${label}`}</h2>
      {!requested ? (
        <button
          type="button"
          className={`${styles.button} ${styles.primary} ${styles.submitButton}`}
          disabled={busy || failed}
          onClick={() => void request()}
        >
          {french
            ? "Recevoir un code de vérification"
            : "Receive a verification code"}
        </button>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
        >
          <p>
            {french
              ? "Saisissez le code reçu. Il est valide dix minutes."
              : "Enter the code you received. It is valid for ten minutes."}
          </p>
          <label className={styles.field}>
            {french
              ? "Code de vérification du second canal"
              : "Second channel verification code"}
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary} ${styles.submitButton}`}
            disabled={busy || !/^\d{6}$/.test(code)}
          >
            {french ? "Vérifier ce canal" : "Verify this channel"}
          </button>
        </form>
      )}
      <p role="alert">{error}</p>
    </section>
  );
}
