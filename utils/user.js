const axios=require('axios');

exports.getUser = async (UserId) =>{
  const UserResponse = await axios.get(`${process.env.MICRO_BACK_URL}/users/${UserId}`);
  const user=UserResponse.data;

  return user;
}
