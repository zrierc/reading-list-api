import { Context, PreTokenGenerationTriggerEvent } from 'aws-lambda';

export async function handler(
  event: PreTokenGenerationTriggerEvent,
  context: Context
) {
  let newScopes = event.request.groupConfiguration.groupsToOverride!.map(
    item => `${item}-${event.callerContext.clientId}`
  );
  event.response = {
    claimsOverrideDetails: {
      claimsToAddOrOverride: {
        scope: newScopes.join(' '),
      },
    },
  };

  return event;
}
