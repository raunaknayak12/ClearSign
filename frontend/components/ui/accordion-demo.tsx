import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Cog, Mail, Users, Zap } from "lucide-react"

interface AccordionData {
  icon: React.ReactNode
  title: string
  content: string[]
}

const accordionData: AccordionData[] = [
  {
    icon: <Zap className="size-4 stroke-2 text-muted-foreground" />,
    title: "Getting Started",
    content: [
      "Create your MynaUI account",
      "Verify your email address",
      "Complete your profile setup",
      "Explore the dashboard",
    ],
  },
  {
    icon: <Users className="size-4 stroke-2 text-muted-foreground" />,
    title: "User Management",
    content: [
      "Invite team members",
      "Set user permissions",
      "Create user groups",
      "Manage access controls",
    ],
  },
  {
    icon: <Cog className="size-4 stroke-2 text-muted-foreground" />,
    title: "Configuration",
    content: [
      "Configure project settings",
      "Set up integrations",
      "Customize appearance",
      "Define workflow rules",
    ],
  },
  {
    icon: <Mail className="size-4 stroke-2 text-muted-foreground" />,
    title: "Communication",
    content: [
      "Set up notification preferences",
      "Configure email templates",
      "Manage communication channels",
      "Review message history",
    ],
  },
]

function IconAccordion() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 max-w-[400px]">
      <Accordion type="single" collapsible className="w-full">
        {accordionData.map((item, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{item.icon}</span>
                {item.title}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 pl-7">
                {item.content.map((step, stepIndex) => (
                  <li key={stepIndex}>{step}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}

export { IconAccordion }
