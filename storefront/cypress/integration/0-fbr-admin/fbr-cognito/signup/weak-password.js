describe("Weak password", () => {
  // Visit the Fogbender Admin login page.
  it("Expect successful login", () => {
    cy.visit("/login");

    // Click on the "Sign up" button.
    cy.get("a.block").contains("Sign up").click();

    // Verify that the "Create a new account" label is visible.
    cy.get("p").contains("Create a new account").should("be.visible");

    // Enter a unique email address into the "Email" input field.
    const currentTimeInMilliseconds = Date.now();
    cy.get('input[name="email"]')
      .type("alice.testfbr")
      .type(currentTimeInMilliseconds)
      .type("@gmail.com");

    // Enter text into the "Name" input field.
    cy.get('input[name="name"]').type("Alice Testfbr");

    // Enter text into the "Password" input field.
    cy.get('input[name="password"]').type("123");

    // Click on the "Sign up" button.
    cy.get('button[type="submit"]').contains("Sign up").click();

    // Verify that the "That's a weak password; please try again." error message is visible.
    cy.get("span.text-red-600.text-sm")
      .contains("That's a weak password; please try again.")
      .should("be.visible");
  });
});
