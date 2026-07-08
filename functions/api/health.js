export async function onRequest(context){return Response.json({ok:true,app:'MansHockey Enterprise 30',d1:Boolean(context.env.DB),r2:Boolean(context.env.FILES)})}
