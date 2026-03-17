const currentUser = {
  name: "Rolly",
  email: "yellowdi@me.com",
  avatarSrc: "",
}

export function useCurrentUser() {
  return {
    currentUser,
  }
}
