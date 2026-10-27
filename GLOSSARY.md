# Personal assistant

Terms for the owner's assistant, its work, and its communication identities.

## Language

**Personal assistant**:
The single initial assistant responsible for the owner's todos, reminders, calendar work, and email work.
_Avoid_: Specialist agent when referring to one of these capabilities

**Agent**:
A configured assistant with a stable identity, its own instructions and permissions, and conversations belonging to that identity. The framework can support multiple agents even though the owner initially uses one.

**Slack bot identity**:
The identity under which an agent communicates in the owner's Slack workspace. Each configured agent has a distinct bot identity.
_Avoid_: Agent when referring only to its Slack identity

**Todo**:
An item on the owner's task list. A todo is distinct from an execution task performed by the agent.
_Avoid_: Task without qualifying whether it means an owner todo or agent execution

**Reminder**:
An owner-requested notification due at a specified time. It is distinct from a background check that decides whether something warrants notifying the owner.

**Approval**:
The owner's permission for one exact proposed action. Calendar changes require approval except for automatic removal of a proven duplicate created by the assistant from that same approved action. Email sending is prohibited and cannot be enabled by approving an individual action.

**Email draft**:
An unsent email saved in the owner's mailbox for manual review and sending. Permission to create a draft does not grant permission to send it or to edit or delete other messages.
