import { useState, useEffect, useRef } from "react";
import { type ActionFunctionArgs, json } from "@remix-run/node";
import { useActionData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Button,
  Tabs,
  Text,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Html5QrcodeScanner } from "html5-qrcode";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const cardId = formData.get("cardId");

  // TODO: backend lookup implementation
  // For now, we'll just return the cardId to simulate a successful find
  console.log("Looking up card:", cardId);

  return json({ status: "success", cardId });
};

export default function ScanPage() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [manualId, setManualId] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const isSubmitting = navigation.state === "submitting";

  const tabs = [
    {
      id: "scan-qr",
      content: "Scan QR",
      panelID: "scan-qr-content",
    },
    {
      id: "manual-entry",
      content: "Manual Entry",
      panelID: "manual-entry-content",
    },
  ];

  useEffect(() => {
    if (selectedTab === 0 && !scanResult) {
      // Initialize scanner
      // We need a slight delay to ensure the DOM element exists
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );
        
        scanner.render(
          (decodedText) => {
            setScanResult(decodedText);
            scanner.clear();
            // Automatically submit scanned result
             submit({ cardId: decodedText }, { method: "post" });
          },
          (error) => {
             // console.warn(error);
          }
        );
        scannerRef.current = scanner;
      }, 100);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch (e) {
            // ignore cleanup errors
          }
        }
      };
    } else {
        // If switching away from scan tab, cleanup
         if (scannerRef.current) {
          try {
            scannerRef.current.clear();
          } catch (e) {
            // ignore
          }
          scannerRef.current = null;
        }
    }
  }, [selectedTab, scanResult, submit]);

  const handleManualSubmit = () => {
    submit({ cardId: manualId }, { method: "post" });
  };

  const handleDetails = () => {
      // Logic to view card details would go here
      // This is a placeholder for the next step of the flow
  };

  const resetScan = () => {
      setScanResult(null);
  }

  return (
    <Page>
      <TitleBar title="Scan Customer Card" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Tabs
                  tabs={tabs}
                  selected={selectedTab}
                  onSelect={setSelectedTab}
                />
                
                {/* Success Message Area */}
                {(actionData?.status === "success" || scanResult) && (
                      <div style={{marginBottom: '1rem'}}>
                        <Banner
                            title="Card Found"
                            tone="success"
                            onDismiss={() => {
                                // simple clear state
                                setScanResult(null);
                                // In a real app we might clear actionData by navigating or state reset
                            }}
                          >
                            <p>Detected Card ID: <strong>{(actionData?.cardId as string) || scanResult}</strong></p>
                        </Banner>
                      </div>
                )}


                {selectedTab === 0 && (
                    <BlockStack gap="400">
                      {!scanResult ? (
                            <div id="reader" style={{ width: "100%", minHeight: "300px" }}></div>
                      ) : (
                          <BlockStack gap="200">
                              <Text as="p" variant="bodyLg">Scan successful!</Text>
                              <Button onClick={resetScan}>Scan Another</Button>
                          </BlockStack>
                      )}
                      <Text as="p" tone="subdued" variant="bodySm">
                        Point the camera at a customer's loyalty card QR code.
                      </Text>
                    </BlockStack>
                  )}

                  {selectedTab === 1 && (
                    <BlockStack gap="400">
                      <TextField
                        label="Card ID"
                        value={manualId}
                        onChange={setManualId}
                        autoComplete="off"
                        disabled={isSubmitting}
                      />
                      <Button
                        onClick={handleManualSubmit}
                        loading={isSubmitting}
                        disabled={!manualId}
                        variant="primary"
                      >
                        Look up Card
                      </Button>
                    </BlockStack>
                  )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
