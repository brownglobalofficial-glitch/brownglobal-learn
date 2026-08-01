export type Access = "free" | "plus";

export type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  school: string;
  level: string;
  duration: string;
  access: Access;
  color: string;
  lessons: number;
};

export type LiveSession = {
  id: string;
  title: string;
  instructor: string;
  startsAt: string;
  durationMinutes: number;
  access: Access;
  kind: string;
  language: string;
};

export const fallbackCourses: Course[] = [
  { id: "c1", slug: "build-your-business", title: "Build Your Business", description: "Turn a real problem into a tested offer, first customer pathway and concise pitch.", school: "Business & Entrepreneurship", level: "Beginner", duration: "4 weeks", access: "free", color: "#0E9F85", lessons: 16 },
  { id: "c2", slug: "digital-marketing-foundations", title: "Digital Marketing Foundations", description: "Plan useful campaigns, choose channels and measure what actually moves the audience.", school: "Marketing & Growth", level: "Beginner", duration: "3 weeks", access: "free", color: "#6C5CE7", lessons: 12 },
  { id: "c3", slug: "create-for-the-internet", title: "Create for the Internet", description: "Build a repeatable system for useful short-form, video and written content.", school: "Media & Creativity", level: "Beginner", duration: "3 weeks", access: "free", color: "#FF514A", lessons: 12 },
  { id: "c4", slug: "ai-for-real-work", title: "AI for Real Work", description: "Use modern AI tools responsibly for research, operations and practical business tasks.", school: "Technology & AI", level: "Intermediate", duration: "5 weeks", access: "plus", color: "#5C77FF", lessons: 20 },
  { id: "c5", slug: "brand-systems", title: "Build a Brand System", description: "Develop positioning, voice, identity and a consistent cross-channel brand toolkit.", school: "Media & Creativity", level: "Intermediate", duration: "4 weeks", access: "plus", color: "#E49D20", lessons: 16 },
  { id: "c6", slug: "leading-small-teams", title: "Leading Small Teams", description: "Set priorities, delegate clearly and build an operating rhythm that people can trust.", school: "Leadership & Careers", level: "Intermediate", duration: "4 weeks", access: "plus", color: "#243E6B", lessons: 15 },
];

const nextWeek = (days: number, hour: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

export const fallbackSessions: LiveSession[] = [
  { id: "s1", title: "From problem to useful offer", instructor: "BrownGlobal Learn Faculty", startsAt: nextWeek(3, 18), durationMinutes: 60, access: "free", kind: "Open class", language: "English" },
  { id: "s2", title: "Customer interviews that reveal the truth", instructor: "BrownGlobal Learn Faculty", startsAt: nextWeek(6, 13), durationMinutes: 75, access: "free", kind: "Workshop", language: "English" },
  { id: "s3", title: "AI workflow lab", instructor: "BrownGlobal Learn Faculty", startsAt: nextWeek(8, 18), durationMinutes: 60, access: "plus", kind: "Interactive lab", language: "English" },
  { id: "s4", title: "Pitch review office hours", instructor: "Venture Challenge Mentors", startsAt: nextWeek(11, 17), durationMinutes: 60, access: "plus", kind: "Office hours", language: "English" },
];

export const pathways = [
  ["01", "Learn", "Take concise lessons and join real online classes."],
  ["02", "Build", "Apply the material to a project with evidence."],
  ["03", "Prove", "Receive feedback and document measurable progress."],
  ["04", "Compete", "Apply on merit for the Wave Original series."],
];
