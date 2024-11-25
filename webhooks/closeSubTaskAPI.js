const axios = require('axios');
require('dotenv').config();

// Accessing environment variables
const API_TOKEN = process.env.API_TOKEN;

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const EMAIL = process.env.EMAIL;
const ISSUE_KEYS = process.env.TICKET_LIST.split(',');

// Base64 encode email and API token
const auth = Buffer.from(`${EMAIL}:${API_TOKEN}`).toString('base64');

// Get subtasks for a given story
async function getSubtasks(issueKey) {
    try {
        // Make a request to the JIRA API to fetch the subtasks for the given issue (story)
        const response = await axios.get(
            `${JIRA_BASE_URL}/rest/api/2/issue/${issueKey}`,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Subtasks are typically listed in the `fields.subtasks` array
        const subtasks = response.data.fields.subtasks;

        if (subtasks.length > 0) {
            // console.log(`Subtasks for ${issueKey}:`);
            // subtasks.forEach(subtask => {
            //     console.log(`- ${subtask.key}: ${subtask.fields.summary}`);
            // });
            return subtasks;
        } else {
            console.log(`No subtasks found for ${issueKey}.`);
        }
    } catch (error) {
        console.error('Error fetching subtasks:', error.message);
    }
}

// Get available transitions for the ticket
async function getTransitions(subtaskKey) {
    try {
        const response = await axios.get(`${JIRA_BASE_URL}/rest/api/2/issue/${subtaskKey}/transitions`, {
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        });
        // console.log(JSON.stringify(response.data.transitions));
        return response.data.transitions;
    } catch (error) {
        console.error('Error fetching transitions:', error.message);
    }
}

// Transition the ticket to "Closed"
async function transitionTicket(transitionId, transitionTo, ticketID) {
    try {
        const response = await axios.post(
            `${JIRA_BASE_URL}/rest/api/2/issue/${ticketID}/transitions`,
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
        console.log(`Ticket ${ticketID} ${transitionTo} successfully.`);
    } catch (error) {
        console.error('Error closing ticket:', error.message);
    }
}

// Main function
(async () => {
    for (var issueKey of ISSUE_KEYS) {
        // Get subtasks for the given story issue key
        var subtasksResponse = await getSubtasks(issueKey); // Assuming ISSUE_KEY is an array and you want to fetch subtasks for the first ticket in the list

        for (var subtask of subtasksResponse) {
            var transitions = await getTransitions(subtask.key);

            if (!transitions.length) {
                continue;
            }

            // console.log(`- ${subtask.key}: ${subtask.fields.summary}`);
            const statuses = ['completed', 'deployed to production', 'release uat', 'in prog'];

            var transitionIndex = -1;

            // Find the current ticket status
            for (var i=0; i < transitions.length; i++) {
                if (statuses.indexOf(transitions[i].name.toLowerCase()) > -1) {
                    transitionIndex = statuses.indexOf(transitions[i].name.toLowerCase());
                    break;
                }
            }
    // console.log('transitionIndex :: ' + transitionIndex);
            // const currentTransition = transitions.find(t => t.name.toLowerCase() === statuses[transitionIndex]);
            // var transitionName = currentTransition.name ? currentTransition.name.toLowerCase() : '';
            // var currentStatus = statuses.indexOf(transitionName);

            for (let index = statuses.length - 1; index > -1; index--) {
                transitions = await getTransitions(subtask.key);

                if (!transitions.length) {
                    break;
                }

                // if (transitionIndex < index + 1) {
                //     continue;
                // }

                // Transits of ticket to various status
                const transition = transitions.find(t => t.name.toLowerCase() === statuses[index]);
                if (transition) {
                    await transitionTicket(transition.id, transition.to.name, subtask.key);
                    // console.log(transition.id);
                } else {
                    console.log(`No transition found for this ticket.`);
                }
            }
        }
    }
})();
