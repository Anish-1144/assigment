import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Page,
  Layout,
  TextField,
  Button,
  Banner,
  Text,
  Stack,
  List,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useQuery } from "react-query";

export default function HomePage() {
  const shopify = useAppBridge();
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["announcement"],
    queryFn: async () => {
      const res = await fetch("/api/announcement");
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (data?.latest?.text != null) setText(data.latest.text);
  }, [data?.latest?.text]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (res.ok) {
        shopify.toast.show("Saved to MongoDB and synced to the storefront");
        await refetch();
      } else {
        const body = await res.json().catch(() => ({}));
        shopify.toast.show(body.error || "Failed to save announcement", {
          isError: true,
        });
      }
    } catch (e) {
      shopify.toast.show(e.message, { isError: true });
    } finally {
      setIsSaving(false);
    }
  }, [text, shopify, refetch]);

  const liveValue = data?.metafieldValue;
  const history = data?.history ?? [];

  return (
    <Page narrowWidth>
      <TitleBar title="Announcement Banner" />
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <Stack vertical spacing="loose">
              <TextField
                label="Announcement Text"
                value={text}
                onChange={setText}
                autoComplete="off"
                placeholder="e.g. Sale 50% Off"
                multiline={2}
              />
              <Button primary loading={isSaving} onClick={handleSave}>
                Save
              </Button>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Banner
            title="Currently live on the storefront"
            status={liveValue ? "success" : "info"}
          >
            <p>
              {isLoading
                ? "Loading…"
                : liveValue
                ? `“${liveValue}”`
                : "No announcement set yet. Save one above to publish it."}
            </p>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card title="History" sectioned>
            {history.length === 0 ? (
              <Text as="p" tone="subdued">
                Nothing saved yet.
              </Text>
            ) : (
              <List type="bullet">
                {history.map((item) => (
                  <List.Item key={item._id}>
                    <Text as="span" fontWeight="semibold">
                      {item.text || "(empty)"}
                    </Text>{" "}
                    — {new Date(item.createdAt).toLocaleString()}
                  </List.Item>
                ))}
              </List>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
