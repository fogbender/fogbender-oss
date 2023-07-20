# Fogbender Initialization

Once you have your services running as described in the [Readme](README.md), it's time to set up your first tenants.

You can do these steps on your first setup or after `make db-clean`.

## Getting started with a Vendor and Customer

1. Create a "Detective" account
   1. In your Elixir terminal (where your server is running via `make`), type:
      `Fog.Data.Detective.add "<email@address>"` with a Google account
   2. Create a "Detective" account at [localhost:3100/detective](http://localhost:3100/detective): click **Detective SIGN IN**, and sign in with the same email. You should see the message "DONE <email address>"
2. Create an invitation code.
   1. Back on the [detective page](http://localhost:3100/detective), click **Fogvite codes**. You'll see an empty list of codes. The left column is the text of the code, and the right column is the number of invitations it allows.
   2. Create a code, for example **dev** in the first column and **100** in the second column.
3. Create a Vendor, Organization, and Workspace
   1. Open [localhost:3100/admin](http://localhost:3100/admin)
   2. If you are not already signed in, click "Continue with Google" and sign in with the account you created earlier.
   3. Enter the code you created above, for example **dev**
   4. Reload the page (per the on-screen instructions), and you should see an empty Fogbender chat interface.
4. Create an Organization and Workspace
   1. Click **Add Organization** and create an organization.
   2. Click **Add Workspace** and create a workspace.
   3. Click **Workspace Settings** to get info for the next step.
5. Configure a Customer
   1. In a new browser, open [localhost:**3200**](http://localhost:3200), which serves the customer app.
   2. **Sign In** with any Google account.
   3. Click on your avatar in the upper-right corner, and select **Your Profile**
   4. Fill in with values from the previous step's **Workspace Settings**.
      - Vendor Name ← vendor you created earlier, to avoid confusion.
      - **Widget ID** ← `widget id` from **Workspace Settings: Step 1** (looks like `dzAwMjY1NzI3NDE5ODEyNDE3NTM2`)
      - **Secret** ← `secret` from **Workspace Settings: Step 2** (looks like `6+/B8gyGRaZRaSEgi+0eJVxk47dom71b`)
      - **User Name** ← anything
      - **Customer Name** ← pick a name for this customer

Done! You should now be able to communicate between the customer and vendor.

- In the original Triage room.
- By creating new rooms, users, and customers.

## Add Fogbender Support

To add the **Fogbender** organization — if you want the experience of supporting Fogbender users using Fogbender — you can invite yourself by invoking `make fog-agent-boot`. By default, nobody is invited to the Fogbender vendor.

    $ nix-shell --pure
    [nix-shell:fogbender] make fog-agent-boot

And reload the Admin page, [localhost:3100/admin](http://localhost:3100/admin).

## TODO

- Each Organization's primary workspace
