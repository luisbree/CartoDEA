import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Settings, Code } from "lucide-react";

export function ShadcnDemoElements() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">UI Showcase</CardTitle>
        <CardDescription>A demonstration of ShadCN UI components.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="Enter your name" />
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="notifications-switch" />
          <Label htmlFor="notifications-switch">Enable Notifications</Label>
        </div>

        <Tabs defaultValue="rocket" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rocket"><Rocket className="mr-2 h-4 w-4" />Launch</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Settings</TabsTrigger>
            <TabsTrigger value="code" className="font-code"><Code className="mr-2 h-4 w-4" />Code</TabsTrigger>
          </TabsList>
          <TabsContent value="rocket" className="p-4 border rounded-md mt-2">
            <p className="text-sm text-muted-foreground">
              This is the launch tab. Prepare for liftoff!
            </p>
            <Button className="mt-4">Launch Mission</Button>
          </TabsContent>
          <TabsContent value="settings" className="p-4 border rounded-md mt-2">
            <p className="text-sm text-muted-foreground">
              Configure your application settings here.
            </p>
            <Button variant="outline" className="mt-4">Save Settings</Button>
          </TabsContent>
          <TabsContent value="code" className="p-4 border rounded-md mt-2 font-code">
            <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
              <code>
{`// Example code snippet
function greet(name: string) {
  console.log(\`Hello, \${name}!\`);
}`}
              </code>
            </pre>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost">Learn More</Button>
        <Button variant="accent">Get Started</Button>
      </CardFooter>
    </Card>
  );
}
