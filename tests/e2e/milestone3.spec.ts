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
