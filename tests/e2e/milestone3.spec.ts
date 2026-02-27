import { expect, test } from "@playwright/test";

test.describe("Milestone 3 auth + tenant guards", () => {
	test("dashboard renders with test-only auth bypass", async ({ page }) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		const orgName = `E2E Workspace ${Date.now()}`;
		const response = await page.context().request.post("/test-support/login", {
			data: { orgName },
		});
		const loginBody = await response.text();
		expect(response.ok(), `login failed: ${response.status()} ${loginBody}`).toBeTruthy();
		await page.goto("/dashboard");

		await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
		await expect(page.getByText(`Workspace: ${orgName}`)).toBeVisible();
		await expect(page.getByText("Plan: FREE")).toBeVisible();

		await page.context().request.post("/test-support/logout");
	});

	test.skip(
		"stale active_org_id cookie recovers cleanly (requires authenticated test user)",
		async () => {
			// TODO: Set stale active_org_id for an authenticated test user and
			// assert recovery clears cookie and returns to onboarding.
		}
	);
});

test.describe("Milestone 4 org switching", () => {
	test("org select page lists multiple workspaces for bypass user", async ({
		page,
	}) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		const firstOrgName = `Select Org A ${Date.now()}`;
		const secondOrgName = `Select Org B ${Date.now()}`;

		const loginRes = await page.context().request.post("/test-support/login", {
			data: { orgName: firstOrgName },
		});
		const loginBody = await loginRes.text();
		expect(loginRes.ok(), `login failed: ${loginRes.status()} ${loginBody}`).toBeTruthy();

		const createSecondRes = await page.context().request.post("/test-support/orgs", {
			data: { orgName: secondOrgName },
		});
		const orgBody = await createSecondRes.text();
		expect(
			createSecondRes.ok(),
			`create org failed: ${createSecondRes.status()} ${orgBody}`
		).toBeTruthy();

		await page.goto("/org/select");

		await expect(
			page.getByRole("heading", { name: "Select a workspace" })
		).toBeVisible();
		await expect(
			page.getByRole("main").getByText(firstOrgName, { exact: true })
		).toBeVisible();
		await expect(
			page.getByRole("main").getByText(secondOrgName, { exact: true })
		).toBeVisible();

		await page.context().request.post("/test-support/logout");
	});

	test("user can switch orgs from the navbar switcher", async ({ page }) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		const firstOrgName = `E2E Org A ${Date.now()}`;
		const secondOrgName = `E2E Org B ${Date.now()}`;

		const loginRes = await page.context().request.post("/test-support/login", {
			data: { orgName: firstOrgName },
		});
		const loginBody = await loginRes.text();
		expect(loginRes.ok(), `login failed: ${loginRes.status()} ${loginBody}`).toBeTruthy();

		const createSecondRes = await page.context().request.post("/test-support/orgs", {
			data: { orgName: secondOrgName },
		});
		const orgBody = await createSecondRes.text();
		expect(
			createSecondRes.ok(),
			`create org failed: ${createSecondRes.status()} ${orgBody}`
		).toBeTruthy();

		await page.goto("/dashboard");
		await expect(page.getByText(`Workspace: ${firstOrgName}`)).toBeVisible();

		await page.getByText(`Org: ${firstOrgName}`).click();
		await page.getByRole("button", { name: secondOrgName }).click();

		await expect(page.getByText(`Workspace: ${secondOrgName}`)).toBeVisible();
		await expect(page.getByText("Your role: OWNER")).toBeVisible();

		await page.context().request.post("/test-support/logout");
	});
});

test.describe("Milestone 5 project tenant isolation", () => {
	test("project created in org A does not appear in org B after switching", async ({
		page,
	}) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		test.setTimeout(60_000);

		const firstOrgName = `Proj Org A ${Date.now()}`;
		const secondOrgName = `Proj Org B ${Date.now()}`;
		const projectName = `A-only Project ${Date.now()}`;

		const loginRes = await page.context().request.post("/test-support/login", {
			data: { orgName: firstOrgName },
		});
		const loginBody = await loginRes.text();
		expect(loginRes.ok(), `login failed: ${loginRes.status()} ${loginBody}`).toBeTruthy();

		const createSecondRes = await page.context().request.post("/test-support/orgs", {
			data: { orgName: secondOrgName },
		});
		const orgBody = await createSecondRes.text();
		expect(
			createSecondRes.ok(),
			`create org failed: ${createSecondRes.status()} ${orgBody}`
		).toBeTruthy();

		await page.goto("/projects");
		await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
		await expect(page.getByText(`Workspace: ${firstOrgName} (FREE)`)).toBeVisible();

		const createProjectRes = await page.context().request.post(
			"/test-support/projects",
			{
				data: { name: projectName },
			}
		);
		const projectBody = await createProjectRes.text();
		expect(
			createProjectRes.ok(),
			`create project failed: ${createProjectRes.status()} ${projectBody}`
		).toBeTruthy();

		await page.reload();
		await expect(
			page.getByRole("main").getByText(projectName, { exact: true })
		).toBeVisible();

		await page.getByTestId("org-switcher-trigger").click();
		await page.getByRole("button", { name: secondOrgName }).click();

		await expect(page.getByText(`Workspace: ${secondOrgName}`)).toBeVisible();
		await page.getByRole("link", { name: "Open projects" }).click();

		await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
		await expect(page.getByText(`Workspace: ${secondOrgName} (FREE)`)).toBeVisible();
		await expect(page.getByText(projectName)).toHaveCount(0);
		await expect(page.getByText("No projects yet for this workspace.")).toBeVisible();

		await page.context().request.post("/test-support/logout");
	});
});

test.describe("Milestone 6 RBAC enforcement", () => {
	test("MEMBER sees view-only projects UI and direct project creation is forbidden", async ({
		page,
	}) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		test.setTimeout(60_000);

		const orgName = `RBAC Org ${Date.now()}`;
		const seedProjectName = `Owner-created ${Date.now()}`;
		const forbiddenProjectName = `Member-create ${Date.now()}`;

		const loginRes = await page.context().request.post("/test-support/login", {
			data: { orgName },
		});
		const loginBody = await loginRes.text();
		expect(loginRes.ok(), `login failed: ${loginRes.status()} ${loginBody}`).toBeTruthy();

		const seedProjectRes = await page.context().request.post("/test-support/projects", {
			data: { name: seedProjectName },
		});
		const seedProjectBody = await seedProjectRes.text();
		expect(
			seedProjectRes.ok(),
			`seed project failed: ${seedProjectRes.status()} ${seedProjectBody}`
		).toBeTruthy();

		const roleRes = await page.context().request.post(
			"/test-support/memberships/active-role",
			{
				data: { role: "MEMBER" },
			}
		);
		const roleBody = await roleRes.text();
		expect(
			roleRes.ok(),
			`set role failed: ${roleRes.status()} ${roleBody}`
		).toBeTruthy();

		await page.goto("/projects");

		await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
		await expect(page.getByText(`Workspace: ${orgName} (FREE)`)).toBeVisible();
		await expect(page.getByText(seedProjectName, { exact: true })).toBeVisible();
		await expect(
			page.getByText("You have view-only access in this workspace.")
		).toBeVisible();
		await expect(page.getByTestId("project-create-form")).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Delete" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
		await expect(page.getByText("View only")).toBeVisible();

		const memberCreateRes = await page.context().request.post("/test-support/projects", {
			data: { name: forbiddenProjectName },
		});
		const memberCreateBody = await memberCreateRes.text();
		expect(
			memberCreateRes.status(),
			`expected forbidden, got ${memberCreateRes.status()} ${memberCreateBody}`
		).toBe(403);

		await page.context().request.post("/test-support/logout");
	});

	test("OWNER can add/change members, while MEMBER sees owner-only controls hidden", async ({
		page,
	}) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		test.setTimeout(90_000);

		const orgName = `Members Org ${Date.now()}`;
		const inviteeEmail = `invitee-${Date.now()}@example.test`;

		const loginRes = await page.context().request.post("/test-support/login", {
			data: { orgName },
		});
		const loginBody = await loginRes.text();
		expect(loginRes.ok(), `login failed: ${loginRes.status()} ${loginBody}`).toBeTruthy();

		const seedUserRes = await page.context().request.post("/test-support/users", {
			data: { email: inviteeEmail, name: "Invited User" },
		});
		const seedUserBody = await seedUserRes.text();
		expect(
			seedUserRes.ok(),
			`seed user failed: ${seedUserRes.status()} ${seedUserBody}`
		).toBeTruthy();

		await page.goto("/members");
		await expect(
			page.getByRole("heading", { level: 1, name: "Members", exact: true })
		).toBeVisible();
		await expect(page.getByText(`Workspace: ${orgName} (FREE)`)).toBeVisible();
		await expect(page.getByText("Your role: OWNER")).toBeVisible();

		await page.getByTestId("member-add-email").fill(inviteeEmail);
		await page.getByTestId("member-add-role").selectOption("MEMBER");
		await page.getByTestId("member-add-submit").click();

		await expect(page.getByText(inviteeEmail)).toBeVisible();
		await expect(page.getByText(/Role: MEMBER/)).toBeVisible();

		await page.getByTestId("member-add-email").fill(inviteeEmail);
		await page.getByTestId("member-add-role").selectOption("MEMBER");
		await page.getByTestId("member-add-submit").click();
		await expect(page.getByTestId("member-add-error")).toContainText(
			"already a member"
		);

		const memberRow = page.getByTestId(/member-row-/).filter({
			has: page.getByText(inviteeEmail),
		});
		await memberRow.getByRole("combobox").selectOption("ADMIN");
		await memberRow.getByRole("button", { name: "Update role" }).click();

		await expect(page.getByText(/Role: ADMIN/)).toBeVisible();

		const ownerRow = page.getByTestId(/member-row-/).filter({
			has: page.getByText("E2E Test User"),
		});
		await ownerRow.getByRole("combobox").selectOption("ADMIN");
		await ownerRow.getByRole("button", { name: "Update role" }).click();
		await expect(page.getByTestId("member-role-error")).toContainText(
			"last owner"
		);
		await expect(ownerRow.getByText(/Role: OWNER/)).toBeVisible();

		const roleRes = await page.context().request.post(
			"/test-support/memberships/active-role",
			{
				data: { role: "MEMBER" },
			}
		);
		const roleBody = await roleRes.text();
		expect(
			roleRes.ok(),
			`set role failed: ${roleRes.status()} ${roleBody}`
		).toBeTruthy();

		await page.reload();
		await expect(page.getByText("Your role: MEMBER")).toBeVisible();
		await expect(
			page.getByText("Only workspace owners can add members.")
		).toBeVisible();
		await expect(page.getByRole("button", { name: "Add member" })).toHaveCount(0);
		await expect(page.getByRole("button", { name: "Update role" })).toHaveCount(0);
		await expect(page.getByText("Owner-only role management")).toHaveCount(2);

		await page.context().request.post("/test-support/logout");
	});
});

test.describe("Milestone 7 usage limits", () => {
	test("over-limit AI requests are blocked and usage page reflects the limit", async ({
		page,
	}) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		test.setTimeout(60_000);

		const orgName = `Usage Org ${Date.now()}`;

		const loginRes = await page.context().request.post("/test-support/login", {
			data: { orgName },
		});
		const loginBody = await loginRes.text();
		expect(loginRes.ok(), `login failed: ${loginRes.status()} ${loginBody}`).toBeTruthy();

		const setUsageRes = await page.context().request.post("/test-support/usage", {
			data: { aiRequestsCount: 24, tokensUsed: 500 },
		});
		const setUsageBody = await setUsageRes.text();
		expect(
			setUsageRes.ok(),
			`set usage failed: ${setUsageRes.status()} ${setUsageBody}`
		).toBeTruthy();

		const consumeAllowedRes = await page.context().request.post(
			"/test-support/usage/consume",
			{
				data: { tokensUsed: 25 },
			}
		);
		const consumeAllowedBody = await consumeAllowedRes.text();
		expect(
			consumeAllowedRes.ok(),
			`consume usage failed: ${consumeAllowedRes.status()} ${consumeAllowedBody}`
		).toBeTruthy();

		const consumeBlockedRes = await page.context().request.post(
			"/test-support/usage/consume",
			{
				data: { tokensUsed: 25 },
			}
		);
		const consumeBlockedBody = await consumeBlockedRes.text();
		expect(
			consumeBlockedRes.status(),
			`expected limit block, got ${consumeBlockedRes.status()} ${consumeBlockedBody}`
		).toBe(429);
		expect(consumeBlockedBody).toContain("USAGE_LIMIT_EXCEEDED");

		await page.goto("/settings/usage");
		await expect(
			page.getByRole("heading", { level: 1, name: "Usage", exact: true })
		).toBeVisible();
		await expect(page.getByText(`Workspace: ${orgName} (FREE)`)).toBeVisible();
		await expect(page.getByTestId("usage-ai-used")).toHaveText("25");
		await expect(page.getByTestId("usage-ai-limit")).toHaveText("25");
		await expect(page.getByTestId("usage-ai-remaining")).toHaveText("0");
		await expect(page.getByTestId("usage-limit-warning")).toBeVisible();

		await page.context().request.post("/test-support/logout");
	});
});

test.describe("Milestone 8 AI project report", () => {
	test("generates a project report, logs usage, and blocks when over limit", async ({
		page,
	}) => {
		test.skip(
			process.env.ENABLE_E2E_TEST_BYPASS !== "1",
			"Set ENABLE_E2E_TEST_BYPASS=1 to enable test bypass routes"
		);

		test.setTimeout(90_000);

		const orgName = `AI Report Org ${Date.now()}`;
		const projectName = `AI Project ${Date.now()}`;

		const loginRes = await page.context().request.post("/test-support/login", {
			data: { orgName },
		});
		const loginBody = await loginRes.text();
		expect(loginRes.ok(), `login failed: ${loginRes.status()} ${loginBody}`).toBeTruthy();

		const createProjectRes = await page.context().request.post("/test-support/projects", {
			data: { name: projectName, description: "Track milestone progress and blockers." },
		});
		const createProjectBody = await createProjectRes.text();
		expect(
			createProjectRes.ok(),
			`create project failed: ${createProjectRes.status()} ${createProjectBody}`
		).toBeTruthy();

		const setUsageRes = await page.context().request.post("/test-support/usage", {
			data: { aiRequestsCount: 24, tokensUsed: 100 },
		});
		const setUsageBody = await setUsageRes.text();
		expect(
			setUsageRes.ok(),
			`set usage failed: ${setUsageRes.status()} ${setUsageBody}`
		).toBeTruthy();

		await page.goto("/ai/project-report");
		await expect(
			page.getByRole("heading", {
				level: 1,
				name: "AI Project Reports",
				exact: true,
			})
		).toBeVisible();
		await expect(page.getByText(`Workspace: ${orgName} (FREE)`)).toBeVisible();

		await page.getByTestId("ai-project-report-project-select").selectOption({
			label: projectName,
		});
		await page.getByTestId("ai-project-report-submit").click();

		await expect(page.getByTestId("ai-project-report-status")).toContainText(
			"generated, logged, and usage updated"
		);
		await expect(page.getByTestId("ai-project-report-history-row")).toContainText(
			projectName
		);
		await expect(page.getByTestId("ai-project-report-output").first()).toContainText(
			"Project Status Report:"
		);

		await page.goto("/settings/usage");
		await expect(page.getByTestId("usage-ai-used")).toHaveText("25");
		await expect(page.getByTestId("usage-ai-limit")).toHaveText("25");
		await expect(page.getByTestId("usage-ai-remaining")).toHaveText("0");
		await expect(page.getByTestId("usage-limit-warning")).toBeVisible();

		await page.goto("/ai/project-report");
		await page.getByTestId("ai-project-report-project-select").selectOption({
			label: projectName,
		});
		await page.getByTestId("ai-project-report-submit").click();
		await expect(page.getByTestId("ai-project-report-status")).toContainText(
			"usage limit reached"
		);

		await page.context().request.post("/test-support/logout");
	});
});
