/**
 * Aquí se arma todo a mano: repositorios, casos de uso y controladores, de adentro
 * hacia afuera. Es el único archivo que conoce todas las capas.
 */
import { systemClock } from "./application/ports/Clock.js";
import { AuthenticateSession } from "./application/use-cases/accounts/AuthenticateSession.js";
import { GetActiveAppointment } from "./application/use-cases/accounts/GetActiveAppointment.js";
import { Login } from "./application/use-cases/accounts/Login.js";
import { RegisterClient } from "./application/use-cases/accounts/RegisterClient.js";
import { SessionIssuer } from "./application/use-cases/accounts/SessionIssuer.js";
import { UpdateProfile } from "./application/use-cases/accounts/UpdateProfile.js";
import { CancelAppointment } from "./application/use-cases/appointments/CancelAppointment.js";
import { ChangeAppointmentStatus } from "./application/use-cases/appointments/ChangeAppointmentStatus.js";
import { CreateAppointment } from "./application/use-cases/appointments/CreateAppointment.js";
import { GetAppointment } from "./application/use-cases/appointments/GetAppointment.js";
import { GetDayAgenda } from "./application/use-cases/appointments/GetDayAgenda.js";
import { ListAppointments } from "./application/use-cases/appointments/ListAppointments.js";
import { RescheduleAppointment } from "./application/use-cases/appointments/RescheduleAppointment.js";
import { GetAvailability } from "./application/use-cases/availability/GetAvailability.js";
import { ListActiveBarbers } from "./application/use-cases/barbers/ListActiveBarbers.js";
import { ListTeam } from "./application/use-cases/barbers/ListTeam.js";
import { IdentifyContact } from "./application/use-cases/contacts/IdentifyContact.js";
import { GetImage } from "./application/use-cases/images/GetImage.js";
import { UploadImage } from "./application/use-cases/images/UploadImage.js";
import { CreateService } from "./application/use-cases/services/CreateService.js";
import { ListCatalog } from "./application/use-cases/services/ListCatalog.js";
import { ListServicesForAdmin } from "./application/use-cases/services/ListServicesForAdmin.js";
import { UpdateService } from "./application/use-cases/services/UpdateService.js";
import { CreateTimeBlock } from "./application/use-cases/time-blocks/CreateTimeBlock.js";
import { DeleteTimeBlock } from "./application/use-cases/time-blocks/DeleteTimeBlock.js";
import { ListTimeBlocks } from "./application/use-cases/time-blocks/ListTimeBlocks.js";
import { TimeZone } from "./domain/value-objects/TimeZone.js";
import { loadConfig } from "./infrastructure/config/env.js";
import { createPrismaClient } from "./infrastructure/persistence/prisma/client.js";
import { PrismaAppointmentRepository } from "./infrastructure/persistence/prisma/PrismaAppointmentRepository.js";
import { PrismaBarberRepository } from "./infrastructure/persistence/prisma/PrismaBarberRepository.js";
import { PrismaClientRepository } from "./infrastructure/persistence/prisma/PrismaClientRepository.js";
import { PrismaImageRepository } from "./infrastructure/persistence/prisma/PrismaImageRepository.js";
import { PrismaServiceRepository } from "./infrastructure/persistence/prisma/PrismaServiceRepository.js";
import { PrismaTimeBlockRepository } from "./infrastructure/persistence/prisma/PrismaTimeBlockRepository.js";
import { PrismaTransactionRunner } from "./infrastructure/persistence/prisma/PrismaTransactionRunner.js";
import { ScryptPasswordHasher } from "./infrastructure/security/ScryptPasswordHasher.js";
import { JwtSessionTokens } from "./infrastructure/security/JwtSessionTokens.js";
import { createApp } from "./presentation/http/app.js";
import { AccountController } from "./presentation/http/controllers/AccountController.js";
import { AgentController } from "./presentation/http/controllers/AgentController.js";
import { AppointmentController } from "./presentation/http/controllers/AppointmentController.js";
import { AvailabilityController } from "./presentation/http/controllers/AvailabilityController.js";
import { CatalogController } from "./presentation/http/controllers/CatalogController.js";
import { ServiceAdminController } from "./presentation/http/controllers/ServiceAdminController.js";
import { TeamController } from "./presentation/http/controllers/TeamController.js";
import { TimeBlockController } from "./presentation/http/controllers/TimeBlockController.js";
import { ApiPresenter } from "./presentation/http/presenters/ApiPresenter.js";

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const clock = systemClock;
const timeZone = new TimeZone(config.timeZoneOffset);

// Infraestructura
const appointments = new PrismaAppointmentRepository(prisma);
const barbers = new PrismaBarberRepository(prisma);
const clients = new PrismaClientRepository(prisma);
const images = new PrismaImageRepository(prisma);
const services = new PrismaServiceRepository(prisma);
const timeBlocks = new PrismaTimeBlockRepository(prisma);
const transactions = new PrismaTransactionRunner(prisma);
const hasher = new ScryptPasswordHasher();
const sessionTokens = new JwtSessionTokens(config.jwtSecret);
const sessionCookie = { secure: config.cookieSecure };

// Casos de uso que se usan en más de un controlador
const sessionIssuer = new SessionIssuer(sessionTokens, clock, config.sessionMinutes);
const authenticateSession = new AuthenticateSession(sessionTokens, clients, barbers, sessionIssuer);
const createTimeBlock = new CreateTimeBlock(timeBlocks, barbers);

const presenter = new ApiPresenter(timeZone);

const app = createApp({
  frontOrigin: config.frontOrigin,
  agentApiKey: config.agentApiKey,
  authenticateSession,
  sessionCookie,
  controllers: {
    catalog: new CatalogController(
      new ListCatalog(services),
      new ListActiveBarbers(barbers),
      new GetImage(images),
      presenter,
    ),
    availability: new AvailabilityController(
      new GetAvailability(services, barbers, timeBlocks, appointments, clock, timeZone, config.slotIntervalMin),
      presenter,
    ),
    appointments: new AppointmentController(
      new CreateAppointment(services, transactions, clock, timeZone, config.welcomeDiscountPct),
      new GetAppointment(appointments),
      new CancelAppointment(appointments),
      new RescheduleAppointment(appointments, transactions, clock, timeZone),
      new ListAppointments(appointments, timeZone),
      new ChangeAppointmentStatus(appointments),
      presenter,
      config.agentApiKey,
    ),
    accounts: new AccountController(
      new Login(barbers, clients, hasher, sessionIssuer),
      new RegisterClient(barbers, clients, hasher, sessionIssuer, clock, config.welcomeDiscountPct),
      new UpdateProfile(clients, barbers),
      new GetActiveAppointment(appointments, clock),
      presenter,
      sessionCookie,
    ),
    agent: new AgentController(
      new IdentifyContact(barbers, clients, appointments, clock, config.welcomeDiscountPct),
      new GetDayAgenda(appointments, timeZone),
      presenter,
    ),
    timeBlocks: new TimeBlockController(
      new ListTimeBlocks(timeBlocks, timeZone),
      createTimeBlock,
      new DeleteTimeBlock(timeBlocks),
      presenter,
    ),
    team: new TeamController(new ListTeam(barbers), presenter),
    serviceAdmin: new ServiceAdminController(
      new ListServicesForAdmin(services),
      new CreateService(services, clock),
      new UpdateService(services, clock),
      new UploadImage(images, clock),
      presenter,
    ),
  },
});

app.listen(config.port, () => {
  console.log(`Back de la barbería escuchando en http://localhost:${config.port}`);
});
