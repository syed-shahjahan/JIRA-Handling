const axios = require('axios');
require('dotenv').config();

// Accessing environment variables
const API_TOKEN = process.env.API_TOKEN;

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const EMAIL = process.env.EMAIL;
const ISSUE_KEY = process.env.TICKET_LIST.split(',');

// Base64 encode email and API token
const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');

// Get available transitions for the ticket
async function getTransitions() {
    try {
        const response = await axios.get(`${JIRA_BASE_URL}/rest/api/2/issue/${ISSUE_KEY}/transitions`, {
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        });
        console.log(JSON.stringify(response.data.transitions));
        return response.data.transitions;
    } catch (error) {
        console.error('Error fetching transitions:', error.message);
    }
}

// Transition the ticket to "Closed"
async function transitionTicket(transitionId, transitionTo) {
    try {
        const response = await axios.post(
            `${JIRA_BASE_URL}/rest/api/2/issue/${ISSUE_KEY}/transitions`,
            {
                transition: {
                id: transitionId,
                },
            },
            {
                headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
                },
            }
        );
        console.log(`Ticket ${ISSUE_KEY} ${transitionTo} successfully.`);
    } catch (error) {
        console.error('Error closing ticket:', error.message);
    }
}

// Main function
(async () => {
    var transitions = await getTransitions();

    const statuses = ['in prog', 'release uat', 'deployed to production', 'completed'];
    var currentStatus = statuses.indexOf(t.name.toLowerCase());

    for (let index = currentStatus; index < currentStatus.length; index++) {
        transitions = await getTransitions();

        // Transits of ticket to various status
        const transition = transitions.find(t => t.name.toLowerCase() === currentStatus[index]);
        if (transition) {
            await transitionTicket(transition.id, transition.to.name);
            console.log(transition.id);
        } else {
            console.log(`No ${transition.to.name} transition found for this ticket.`);
        }
    }

    transitions = await getTransitions();
    // Transit to Release UAT
    const releaseUATTransition = transitions.find(t => t.name.toLowerCase() === 'release uat');
    console.log(releaseUATTransition);
    if (releaseUATTransition) {
        await transitionTicket(releaseUATTransition.id, releaseUATTransition.to.name);
    } else {
        console.log('No "Release UAT" transition found for this ticket.');
    }

    transitions = await getTransitions();
    // Transit to Release UAT
    const releasePRODTransition = transitions.find(t => t.name.toLowerCase() === 'deployed to production');
    console.log(releasePRODTransition);
    if (releasePRODTransition) {
        await transitionTicket(releasePRODTransition.id, releasePRODTransition.to.name);
    } else {
        console.log('No "Release for PRODUCTION" transition found for this ticket.');
    }

    transitions = await getTransitions();
    const closeTransition = transitions.find(t => (['in prog', 'release uat', 'deployed to production', 'completed'].indexOf(t.name.toLowerCase()) > -1));
    // Transit to Close
    if (closeTransition) {
        await transitionTicket(closeTransition.id, closeTransition.to.name);
        console.log(closeTransition.id);
    } else {
        console.log('No "Close" transition found for this ticket.');
    }
})();
