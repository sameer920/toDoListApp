function handleForm() {

    let input = document.getElementById('inputField').value;
    if (input === "") {
        document.getElementById('inputField').focus();
        console.log("stopping");
        return false;

    } else {
        console.log("failed to stop")
        document.getElementById('inputField').action = '/';
        return true;
    }
}