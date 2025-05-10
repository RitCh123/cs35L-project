function groupFriends(reservation){
    const groups = {}
    
    reservation.forEach((user) =>{
        const k = user.game;
        if(!groups[k]){
            groups[k] = []
        }
        groups[k].push(user.name);
        

    });



    const groupings = Object.keys(groups).map((k) => {
        return {
            game: k,
            players: groups[k]
        }
    })

    return groupings;


}

const testReservations = [
    { name: "Alice", game: "Valorant" },
    { name: "Bob", game: "Valorant" },
    { name: "Charlie", game: "Overcooked" },
    { name: "Dana", game: "Valorant" },
    { name: "Eli", game: "Overcooked" },
  ];
  
console.log(groupFriends(testReservations));