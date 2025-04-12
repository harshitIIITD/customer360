"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Brain,
  Database,
  GitMerge,
  ShieldCheck,
  Sparkles,
  Zap,
  Code,
  Server,
  Globe,
  Smartphone,
  Laptop,
  Cloud,
  Play,
  PauseCircle,
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

export function AgentCollaborationPanel() {
  const [activeTab, setActiveTab] = useState("agents")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState(0)
  const [activeAgents, setActiveAgents] = useState<string[]>([])
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const agents = [
    {
      id: "requirements",
      name: "Requirements Analyzer",
      description: "Analyzes business requirements to understand data needs and objectives",
      icon: <Brain className="h-5 w-5" />,
      status: "idle",
    },
    {
      id: "schema",
      name: "Schema Designer",
      description: "Creates optimal data schemas based on requirements and best practices",
      icon: <Database className="h-5 w-5" />,
      status: "idle",
    },
    {
      id: "source",
      name: "Source System Mapper",
      description: "Identifies source systems and maps attributes to target schema",
      icon: <GitMerge className="h-5 w-5" />,
      status: "idle",
    },
    {
      id: "quality",
      name: "Data Quality Agent",
      description: "Ensures data quality standards are met and identifies potential issues",
      icon: <ShieldCheck className="h-5 w-5" />,
      status: "idle",
    },
    {
      id: "governance",
      name: "Governance Agent",
      description: "Applies data governance policies and ensures compliance requirements are met",
      icon: <Code className="h-5 w-5" />,
      status: "idle",
    },
    {
      id: "orchestrator",
      name: "Orchestrator",
      description: "Coordinates all agents and ensures they work together effectively",
      icon: <Zap className="h-5 w-5" />,
      status: "idle",
    },
  ]

  const platforms = [
    {
      id: "web",
      name: "Web Platform",
      description: "Customer portal and web applications",
      icon: <Globe className="h-5 w-5" />,
      components: ["Frontend UI", "Backend API", "Authentication", "Analytics"],
    },
    {
      id: "mobile",
      name: "Mobile Platform",
      description: "iOS and Android mobile applications",
      icon: <Smartphone className="h-5 w-5" />,
      components: ["Native Apps", "Push Notifications", "Offline Support", "Biometrics"],
    },
    {
      id: "desktop",
      name: "Desktop Platform",
      description: "Windows and macOS desktop applications",
      icon: <Laptop className="h-5 w-5" />,
      components: ["Desktop UI", "Local Storage", "System Integration", "Printing"],
    },
    {
      id: "cloud",
      name: "Cloud Platform",
      description: "Cloud-based services and infrastructure",
      icon: <Cloud className="h-5 w-5" />,
      components: ["Microservices", "Serverless Functions", "Data Storage", "Message Queue"],
    },
    {
      id: "backend",
      name: "Backend Systems",
      description: "Core banking and processing systems",
      icon: <Server className="h-5 w-5" />,
      components: ["Transaction Processing", "Account Management", "Batch Processing", "Reporting"],
    },
  ]

  const handleStartSimulation = () => {
    setIsSimulating(true)
    setSimulationProgress(0)
    setActiveAgents([])

    // Simulate agent collaboration with a progress bar
    const interval = setInterval(() => {
      setSimulationProgress((prev) => {
        const newProgress = prev + 2

        // Activate agents at different stages
        if (newProgress === 10) setActiveAgents(["requirements"])
        if (newProgress === 30) setActiveAgents(["requirements", "schema"])
        if (newProgress === 50) setActiveAgents(["requirements", "schema", "source"])
        if (newProgress === 70) setActiveAgents(["requirements", "schema", "source", "quality"])
        if (newProgress === 85) setActiveAgents(["requirements", "schema", "source", "quality", "governance"])
        if (newProgress === 95)
          setActiveAgents(["requirements", "schema", "source", "quality", "governance", "orchestrator"])

        if (newProgress >= 100) {
          clearInterval(interval)
          setIsSimulating(false)
          toast({
            title: "Simulation Complete",
            description: "All agents have successfully collaborated to design the multi-platform system.",
          })
          return 100
        }
        return newProgress
      })
    }, 200)

    return () => clearInterval(interval)
  }

  const handleStopSimulation = () => {
    setIsSimulating(false)
    setSimulationProgress(0)
    setActiveAgents([])
    toast({
      title: "Simulation Stopped",
      description: "The agent collaboration simulation has been stopped.",
    })
  }

  const handleSelectPlatform = (platformId: string) => {
    setSelectedPlatform(platformId)
    toast({
      title: "Platform Selected",
      description: `The ${platforms.find((p) => p.id === platformId)?.name} has been selected for integration.`,
    })
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Multi-Agent Collaboration</CardTitle>
            <CardDescription>
              Our platform uses multiple specialized AI agents working together to solve complex data problems
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {isSimulating ? (
              <Button variant="outline" onClick={handleStopSimulation}>
                <PauseCircle className="mr-2 h-4 w-4" />
                Stop Simulation
              </Button>
            ) : (
              <Button onClick={handleStartSimulation}>
                <Play className="mr-2 h-4 w-4" />
                Simulate Collaboration
              </Button>
            )}
          </div>
        </div>
        {isSimulating && (
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span>Simulation Progress</span>
              <span>{simulationProgress}%</span>
            </div>
            <Progress value={simulationProgress} className="h-2" />
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agents">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Agents
            </TabsTrigger>
            <TabsTrigger value="platforms">
              <Globe className="mr-2 h-4 w-4" />
              Platforms
            </TabsTrigger>
            <TabsTrigger value="integration">
              <GitMerge className="mr-2 h-4 w-4" />
              Integration
            </TabsTrigger>
          </TabsList>
          <TabsContent value="agents" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <Card
                  key={agent.id}
                  className={`transition-all duration-300 ${
                    activeAgents.includes(agent.id) ? "border-primary shadow-md bg-primary/5" : ""
                  }`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`rounded-full p-1.5 ${
                            activeAgents.includes(agent.id)
                              ? "bg-primary/20 text-primary animate-pulse"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {agent.icon}
                        </div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                      </div>
                      {activeAgents.includes(agent.id) && <Badge className="bg-primary">Active</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="platforms" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {platforms.map((platform) => (
                <Card
                  key={platform.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedPlatform === platform.id
                      ? "border-primary shadow-md"
                      : "hover:border-primary/50 hover:shadow-sm"
                  }`}
                  onClick={() => handleSelectPlatform(platform.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-full p-1.5 ${
                          selectedPlatform === platform.id
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {platform.icon}
                      </div>
                      <CardTitle className="text-base">{platform.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{platform.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {platform.components.map((component) => (
                        <Badge key={component} variant="outline" className="bg-primary/5">
                          {component}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="integration" className="mt-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Multi-Platform Integration</CardTitle>
                  <CardDescription>
                    Design a system that integrates across multiple platforms with our AI agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border p-4 bg-muted/20">
                    <h3 className="font-medium mb-2">Integration Architecture</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-primary" />
                          <span className="font-medium">API Gateway</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          Centralized entry point for all platform interactions
                        </p>
                        <div className="pl-6">
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            <Code className="h-3 w-3 mr-1" />
                            View API Specs
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <GitMerge className="h-4 w-4 text-primary" />
                          <span className="font-medium">Event Bus</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          Asynchronous communication between platforms
                        </p>
                        <div className="pl-6">
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            <Code className="h-3 w-3 mr-1" />
                            View Event Schema
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-primary" />
                          <span className="font-medium">Data Lake</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">Centralized storage for all platform data</p>
                        <div className="pl-6">
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            <Code className="h-3 w-3 mr-1" />
                            View Data Model
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="font-medium">AI Services</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">Shared AI capabilities across platforms</p>
                        <div className="pl-6">
                          <Button variant="outline" size="sm" className="text-xs h-7">
                            <Code className="h-3 w-3 mr-1" />
                            View AI Services
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t">
                  <Button className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Integration Code
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Code Templates</CardTitle>
                  <CardDescription>Ready-to-use code templates for multi-platform integration</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="h-auto p-4 justify-start text-left">
                      <div>
                        <p className="font-medium flex items-center">
                          <Globe className="h-4 w-4 mr-2 text-primary" />
                          API Gateway Setup
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Configure an API gateway for cross-platform communication
                        </p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 justify-start text-left">
                      <div>
                        <p className="font-medium flex items-center">
                          <GitMerge className="h-4 w-4 mr-2 text-primary" />
                          Event Bus Integration
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Set up event-driven communication between platforms
                        </p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 justify-start text-left">
                      <div>
                        <p className="font-medium flex items-center">
                          <Database className="h-4 w-4 mr-2 text-primary" />
                          Data Synchronization
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Synchronize data across multiple platforms</p>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-auto p-4 justify-start text-left">
                      <div>
                        <p className="font-medium flex items-center">
                          <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                          Authentication Service
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Implement unified authentication across platforms
                        </p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="border-t flex justify-between">
        <p className="text-sm text-muted-foreground">
          {isSimulating
            ? "AI agents are collaborating to design your multi-platform system..."
            : "Start the simulation to see how our AI agents collaborate"}
        </p>
        <Button variant="outline" size="sm">
          <Code className="mr-2 h-4 w-4" />
          View Documentation
        </Button>
      </CardFooter>
    </Card>
  )
}
