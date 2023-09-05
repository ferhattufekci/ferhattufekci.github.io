<?php
// error_reporting(E_ALL);
// ini_set('display_errors', 1);
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // The process of retrieving data from the form.
    $name = $_POST["name"];
    $email = $_POST["email"];
    $message = $_POST["form-message"];


    // Sending email (using PHP's mail() function)
    $to = "ferhattufekci@outlook.com.tr"; // Address to send e-mail to
    $subject = "Contact Form Message"; // Email subject
    $headers = "From: " . $email; // Sender's email address
    $message = "Sender: " . $name . "\nemail: " . $email . "\n\n" . $message; // Email content

    // The process of sending the e-mail
    if (mail($to, $subject, $message, $headers)) {
        echo "Your message has been sent successfully.";
    } else {
        echo "There was a problem, please try again.";
    }
}
?>
