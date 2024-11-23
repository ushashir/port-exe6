const express = require('express');
const axios = require('axios').default;

const app = express();
const port = 3001;

const CLIENT_ID = process.env.CLIENT_ID || "org_YikFi0uTjeRYeK90";
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const API_URL = process.env.API_URL || "https://api.getport.io/v1";
const SERVICE_BLUEPRINT = process.env.SERVICE_BLUEPRINT;
const FRAMEWORK_BLUEPRINT = process.env.FRAMEWORK_BLUEPRINT

// Function to fetch the access token
const fetchAccessToken = async () => {
  try {
    const response = await axios.post(`${API_URL}/auth/access_token`, {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });
    return response.data.accessToken;
  } catch (error) {
    console.error("Error fetching access token:", error.message);
    throw new Error("Failed to fetch access token.");
  }
};

// Function to fetch all entities of a blueprint
const fetchEntities = async (blueprint, accessToken) => {
  const config = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };

  const response = await axios.get(
    `${API_URL}/blueprints/${blueprint}/entities`,
    config
  );

  return response.data;
};

// Function to update the "number_of_eol_packages" property for a service
const updateServiceEntity = async (serviceId, eolCount, accessToken) => {
  const config = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  await axios.patch(
    `${API_URL}/blueprints/${SERVICE_BLUEPRINT}/entities/${serviceId}`,
    {
      properties: {
        number_of_eol_packages: eolCount,
      },
    },
    config
  );
};

// Route for Exercise 6
app.get('/update-eol-packages', async (req, res) => {
  try {
    const accessToken = await fetchAccessToken();

    // Fetch service and framework entities
    const services = await fetchEntities(SERVICE_BLUEPRINT, accessToken);
    const frameworks = await fetchEntities(FRAMEWORK_BLUEPRINT, accessToken);

    // Create a map of framework states
    const frameworkStates = {};
    frameworks.forEach((framework) => {
      frameworkStates[framework.identifier] = framework.properties.state;
    });

    // Calculate and update EOL count for each service
    for (const service of services) {
      const usedFrameworks = service.relations?.used_frameworks || [];
      let eolCount = 0;

      usedFrameworks.forEach((fwId) => {
        if (frameworkStates[fwId] === "EOL") {
          eolCount++;
        }
      });

      await updateServiceEntity(service.identifier, eolCount, accessToken);
    }

    res.send("Updated number of EOL packages for all services successfully!");
  } catch (error) {
    console.error("Error updating EOL packages:", error.message);
    res.status(500).send(`Error updating EOL packages: ${error.message}`);
  }
});

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the Express server
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});