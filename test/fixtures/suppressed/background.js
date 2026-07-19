// The first timer is knowingly accepted; the second is not.

// mv3-doctor-disable-next-line
setInterval(() => self.console.log("intentional"), 1000);

setInterval(() => self.console.log("not intentional"), 1000);
