# Create Your First Company

A company in Paperclip is the container for everything: your mission, your team of agents, all the tasks they work through, and the budget that keeps spending under control. Before any agents can do anything, they need a company to work inside.

The good news is you don't set this up piece by piece anymore. When you open Paperclip for the first time, a guided wizard walks you through naming your company, writing its mission, and bringing your first agent online — all in one flow. By the time you finish, you land on a task with a welcome message already waiting from your first teammate.

This guide walks you through that wizard end to end. The whole thing takes about three minutes.

---

## Before you start

Make sure Paperclip is installed and running. If you haven't done that yet, start with the [Installation guide](./installation.md).

The wizard opens on its own the first time you have a company with no agents yet, so you usually don't need to hunt for a button — it comes to you.

---

## The onboarding wizard

The wizard is a short, guided flow with a progress bar across the top. Each step builds on the last, and you can walk back a step at any time if you want to change an earlier answer.

### 1. Choose how you want to start

The first screen greets you with **Welcome to Paperclip** and asks **How would you like to get started?** You get two choices:

- **Build a new company** — Begin with a mission, bring on a lead agent, and grow a team of agents to do the work. This is the path this guide follows.
- **Add agents to your org** — Bring AI agents into your existing team or workflows.

Pick **Build a new company** to set up a fresh company from scratch.

### 2. Name your organization

Next, Paperclip asks **What should we call your team or company?** Type a name in the **Name** field.

This is just a label for your own reference — it doesn't affect how agents work. Pick something that describes the purpose of this particular AI company:

- "Content Marketing Agency"
- "Software MVP"
- "Customer Support Automation"

You can rename the company later from its settings, so don't overthink it. Press **Next** to continue.

### 3. Define your mission

Your mission is the north star that every agent in your company can see. As the step explains, your mission guides everything — your lead agent, who you bring on, and the work your company takes on.

Paperclip asks **How would you like to define your mission?** and gives you two paths:

**Path A — I know my mission (type it directly).** If you already know what this company should achieve, choose this and write it into the **Mission** field. A few prompt chips sit below the box to spark ideas if you want a starting point.

A good mission has two things: **a specific outcome** and **a measurable target**. Vague missions give agents nothing concrete to anchor their work to.

| Instead of… | Write… |
|-------------|--------|
| "Grow the business" | "Reach $10,000/month in recurring revenue by Q3" |
| "Do content marketing" | "Publish 4 high-quality blog posts per week and grow organic traffic to 10,000 monthly visitors by June" |
| "Build an app" | "Ship a working MVP with user authentication, a core feature, and a landing page by May 1st" |

> **Tip:** Include a metric and a timeframe. "Build the #1 AI note-taking app at $1M ARR within 6 months" is a mission an agent can reason about. "Improve the product" is not.

**Path B — Help me figure it out (answer a few questions).** If you're not sure how to phrase it yet, choose this and answer a short guided questionnaire:

- What does your team work on?
- Who do you serve?
- What's your biggest bottleneck right now?
- What would success look like in 6 months?

When you press **Generate my mission**, Paperclip assembles your answers into a draft mission and shows it back to you with the note *"Here's your draft mission — edit it however you like."* Tweak the wording until it reads the way you want. You can always jump back to the questions if you'd rather start over.

Whichever path you take, you can change your mission later in settings. Press **Confirm mission** to lock it in. This is the moment Paperclip actually creates your company and saves the mission as its company-level goal.

### 4. Create your first agent

Now you name the agent who will drive the work. Paperclip defaults the name to **Chief of staff**, but you can rename it to anything you like in the **Name** field.

This first agent is your team lead — it reads the mission, proposes a plan, and helps steer everything toward it. Press **Next** when you're happy with the name.

### 5. Connect a model

An agent needs an AI model behind it to actually think and act. This step asks you to pick the adapter and model your lead will run on, then check the environment.

- **Adapter** — Choose how the agent runs. The recommended adapters (like Claude Code) run an agent directly on your Mac; more options are available if you need them.
- **Model** — Pick which model powers the agent from the model list for your chosen adapter.
- **Adapter environment check** — Paperclip runs an inline check here so you don't discover problems later. Press **Test now** and it runs a live probe that asks the adapter CLI to respond with hello. A green **Passed** means you're good to go. If it fails, the step shows a manual debug command and a hint about setting the right API key or logging in.

For a deeper look at adapters, models, and environment variables — and how to fix a failing check — see [Hire Your First Agent](./your-first-agent.md).

When the check passes, press **Connect**. Paperclip hires your lead agent and brings it online.

### 6. Review

The last step is a quick **Review** confirming your first agent is online and ready to work. You'll see a checklist of everything that's now set up:

- Organization name
- Mission
- Agent created
- Model connected

Press **Get started** to head into your company.

---

## Where you land

Press **Get started** and Paperclip drops you straight into the work — not an empty dashboard. It seeds an **Onboarding** project with a first task for you, and your new teammate has already posted a welcome message on that task.

That greeting reflects back the mission you just wrote and lets you know the agent is putting together a few focused questions so you can settle on a concrete goal to tackle first. In other words, your company isn't just created — your first teammate is already reaching out to get to work.

---

## If the wizard doesn't appear (or you closed it)

The wizard opens automatically for any company that has no agents yet. It's offered once per company each time you visit, so if you dismiss it and navigate away, it won't keep popping back up during that visit. Reload the page and Paperclip treats it as a fresh visit — if the company still has no agents, the wizard is offered again.

---

## A note on multiple companies

You can create as many companies as you want in Paperclip. Each is entirely self-contained — separate agents, tasks, missions, and budgets. This is useful if you want to run different AI-powered initiatives in parallel: a development company and a marketing company, for example, with separate teams and budgets for each.

Switch between companies using the company selector in the sidebar. Any new company you create starts with no agents, so the onboarding wizard offers to walk you through it again.

---

Your company is live and your first agent is online. Next, learn how to hire additional agents and fine-tune how each one is configured.

[Hire Your First Agent →](./your-first-agent.md)
