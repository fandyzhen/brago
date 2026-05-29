import * as React from "react";
import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from "@react-email/components";

type Props = {
  appUrl: string;
  manageUrl: string;
  unsubscribeUrl: string;
  firstName?: string;
};

export function WeeklyReminderEmail({
  appUrl,
  manageUrl,
  unsubscribeUrl,
  firstName,
}: Props) {
  const greet = firstName ? `Hey ${firstName},` : "Hey there,";
  return (
    <Html>
      <Body
        style={{
          fontFamily: "Inter, Arial, sans-serif",
          background: "#f7f7f7",
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            background: "#ffffff",
            padding: "24px",
            borderRadius: "12px",
            maxWidth: 520,
          }}
        >
          <Heading style={{ fontSize: 22, margin: 0 }}>
            You have not posted to Google this week
          </Heading>
          <Text>{greet}</Text>
          <Text>
            Keep your Google Business Profile fresh — drop today&rsquo;s job
            into Brago and we&rsquo;ll draft a Google-ready post you can
            paste straight in.
          </Text>
          <Section style={{ margin: "16px 0" }}>
            <Button
              href={`${appUrl}/create`}
              style={{
                background: "#111111",
                color: "#ffffff",
                padding: "10px 16px",
                borderRadius: 8,
                textDecoration: "none",
              }}
            >
              Upload today&rsquo;s job
            </Button>
            <Text style={{ marginTop: 10 }}>
              <Link href={`${appUrl}/dashboard`}>Or pick a recent post</Link>
            </Text>
          </Section>
          <Text style={{ fontSize: 12, color: "#666666" }}>
            <Link href={manageUrl}>Manage reminders</Link> &middot;{" "}
            <Link href={unsubscribeUrl}>Pause for 4 weeks or unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
